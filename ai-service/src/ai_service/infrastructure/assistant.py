import json
import logging
import re
from collections.abc import Sequence
from datetime import date, datetime, timedelta
from typing import Any, Literal
from zoneinfo import ZoneInfo

from smolagents import LiteLLMModel, LogLevel, Tool, ToolCallingAgent

from ai_service.config import Settings
from ai_service.domain.models import AssistantContext, AssistantRecommendation, AssistantReply
from ai_service.domain.ports import AssistantPort
from ai_service.infrastructure.ota import OTAClient, compact_json
from ai_service.infrastructure.prompt_loader import load_prompt
from ai_service.infrastructure.web_search import WeatherWebSearch

logger = logging.getLogger(__name__)

_LOCATION_SUFFIXES = (
    "иями",
    "ями",
    "ами",
    "ого",
    "его",
    "ому",
    "ему",
    "ыми",
    "ими",
    "иях",
    "ях",
    "ах",
    "ов",
    "ев",
    "ей",
    "ом",
    "ем",
    "ой",
    "ый",
    "ий",
    "ое",
    "ее",
    "ая",
    "яя",
    "ую",
    "юю",
    "ые",
    "ие",
    "а",
    "я",
    "ы",
    "и",
    "е",
    "у",
    "ю",
)
_INTERNAL_ID_LABEL = re.compile(
    r"(?i)\s*\(\s*(?:id|uuid)\s*[:#]?\s*[0-9a-f-]{1,36}\s*\)|"
    r"\b(?:id|uuid)\s*[:#]?\s*[0-9a-f-]{1,36}\b"
)
_UUID = re.compile(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b", re.I)
CENTRE_RADIUS_KM = 5.0


def _word_stem(value: str) -> str:
    word = value.casefold()
    for suffix in _LOCATION_SUFFIXES:
        if len(word) - len(suffix) >= 4 and word.endswith(suffix):
            return word[: -len(suffix)]
    return word


def _requested_location_id(
    ota: OTAClient, history: Sequence[tuple[str, str]], message: str
) -> int | None:
    user_messages = [content for role, content in history if role == "user"] + [message]
    if not any(
        re.search(
            r"тур|экскурс|продукт|впечатлен|жиль|отел|гостиниц|хостел|апартамент|"
            r"квартир|прожив|размещ|останов|ночев|номер",
            content,
            re.IGNORECASE,
        )
        for content in user_messages
    ):
        return None
    locations = ota.locations()
    for user_message in reversed(user_messages):
        user_words = re.findall(r"[\w-]+", user_message.casefold())
        matches: list[tuple[int, int]] = []
        for location in locations:
            location_id = location.get("id")
            if not isinstance(location_id, int):
                continue
            location_names = (location.get("name"), location.get("name_ru"))
            for name in location_names:
                if not isinstance(name, str):
                    continue
                name_words = re.findall(r"[\w-]+", name.casefold())
                for name_word in name_words:
                    stem = _word_stem(name_word)
                    if len(stem) < 4:
                        continue
                    if any(word == name_word for word in user_words):
                        matches.append((2, location_id))
                    elif any(_word_stem(word) == stem for word in user_words):
                        matches.append((1, location_id))
        if matches:
            # Prefer the strongest name match; the smallest ID is a stable tie-breaker
            # for duplicate translated location records.
            return sorted(matches, key=lambda item: (-item[0], item[1]))[0][1]
    return None


def _requested_product_type(history: Sequence[tuple[str, str]], message: str) -> str | None:
    user_messages = [content for role, content in history if role == "user"] + [message]
    for user_message in reversed(user_messages):
        if re.search(r"тур|экскурс", user_message, re.IGNORECASE):
            return "tour"
        if re.search(r"товар|услуг|продукт|впечатлен", user_message, re.IGNORECASE):
            return None
    return None


def _hide_internal_ids(message: str) -> str:
    message = _INTERNAL_ID_LABEL.sub("", message)
    return _UUID.sub("", message).strip()


LISTING_TYPE_ALIASES = {
    "hostel": ("хостел", "hostel"),
    "hotel": ("отел", "гостиниц", "hotel"),
    "apartment": ("апартамент", "квартир", "apartment", "flat"),
    "guest_house": ("гостев", "guest house", "guesthouse"),
    "cottage": ("коттедж", "cottage"),
    "camping": ("кемпинг", "camping"),
}
LISTING_TYPE_CATALOG_ALIASES = {
    "hostel": ("хостел", "hostel"),
    "hotel": ("отел", "гостиниц", "hotel"),
    "apartment": ("апартамент", "apartment"),
    "guest_house": ("гостев", "guest_house", "guest house"),
    "cottage": ("коттедж", "cottage"),
    "camping": ("кемпинг", "camping"),
}


def _requested_listing_type(history: Sequence[tuple[str, str]], message: str) -> str | None:
    requested_type = None
    user_messages = [content for role, content in history if role == "user"] + [message]
    for user_message in user_messages:
        normalized = user_message.casefold()
        matches = [
            (normalized.rfind(alias), listing_type)
            for listing_type, aliases in LISTING_TYPE_ALIASES.items()
            for alias in aliases
            if alias in normalized
        ]
        if matches:
            requested_type = max(matches)[1]
    return requested_type


def _requested_centre_radius_km(history: Sequence[tuple[str, str]], message: str) -> float | None:
    user_messages = [content for role, content in history if role == "user"] + [message]
    for user_message in reversed(user_messages):
        if re.search(r"центр\w*|downtown|city\s+cent(?:er|re)|central", user_message, re.I):
            return CENTRE_RADIUS_KM
    return None


RECOMMENDATION_COUNT_WORDS = {
    "пару": 2,
    "пара": 2,
    "парочку": 2,
    "один": 1,
    "одна": 1,
    "одно": 1,
    "два": 2,
    "две": 2,
    "три": 3,
    "четыре": 4,
    "пять": 5,
    "шесть": 6,
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
}
RECOMMENDATION_TARGET = re.compile(
    r"карточ\w*|вариант\w*|предложен\w*|объект\w*|хостел\w*|отел\w*|"
    r"гостиниц\w*|апартамент\w*|тур\w*|экскурс\w*|продукт\w*"
)
DATE_MONTH = re.compile(
    r"январ|феврал|март|апрел|ма[яй]|июн|июл|август|сентябр|октябр|ноябр|декабр|"
    r"january|february|march|april|may|june|july|august|september|october|november|december",
    re.IGNORECASE,
)
NON_RECOMMENDATION_COUNT = re.compile(
    r"гост\w*|человек\w*|взросл\w*|дет\w*|ноч\w*|сут\w*|дат\w*|"
    r"комнат\w*|спален\w*|месяц\w*|лет\b"
)


def _count_in_message(message: str) -> int | None:
    normalized = message.casefold()
    for match in re.finditer(
        r"\b\d+\b|\bпару\b|\bпара\b|\bпарочку\b|\bодин\b|\bодна\b|\bодно\b|"
        r"\bдва\b|\bдве\b|\bтри\b|\bчетыре\b|\bпять\b|\bшесть\b|"
        r"\bone\b|\btwo\b|\bthree\b|\bfour\b|\bfive\b|\bsix\b",
        normalized,
    ):
        count = RECOMMENDATION_COUNT_WORDS.get(match.group())
        if count is None:
            try:
                count = int(match.group())
            except ValueError:
                continue
        if count < 1:
            continue
        local_start = max(0, match.start() - 12)
        local_end = min(len(normalized), match.end() + 16)
        local_context = normalized[local_start:local_end]
        if NON_RECOMMENDATION_COUNT.search(local_context) or DATE_MONTH.search(local_context):
            continue
        context_start = max(0, match.start() - 28)
        context_end = min(len(normalized), match.end() + 40)
        context = normalized[context_start:context_end]
        if RECOMMENDATION_TARGET.search(context):
            return min(count, 6)
    return None


def _requested_recommendation_limit(history: Sequence[tuple[str, str]], message: str) -> int | None:
    requested_limit = None
    for user_message in [content for role, content in history if role == "user"] + [message]:
        count = _count_in_message(user_message)
        if count is not None:
            requested_limit = count
    return requested_limit


class RecommendationCollector:
    def __init__(self, limit: int = 3) -> None:
        self._items: dict[tuple[str, str], AssistantRecommendation] = {}
        self._limit = max(1, min(limit, 6))

    @staticmethod
    def _image_url(value: Any) -> str | None:
        if isinstance(value, str) and value.strip():
            return value.strip()
        if isinstance(value, dict):
            url = value.get("url")
            if isinstance(url, str) and url.strip():
                return url.strip()
        return None

    def add(
        self,
        kind: Literal["listing", "product"],
        items: Any,
        *,
        limit: int = 6,
        replace: bool = False,
    ) -> None:
        if not isinstance(items, list):
            return
        if replace:
            self._items = {key: value for key, value in self._items.items() if key[0] != kind}
        limit = max(1, min(limit, 6))
        added = 0
        for result in items:
            if not isinstance(result, dict):
                continue
            item = result
            if kind == "listing" and isinstance(result.get("listing"), dict):
                item = result["listing"]
            item_id = item.get("id")
            title = item.get("title") if kind == "listing" else item.get("name")
            if (
                not isinstance(item_id, (str, int))
                or not isinstance(title, str)
                or not title.strip()
            ):
                continue
            image_url = self._image_url(
                item.get("main_picture") if kind == "listing" else item.get("thumbnail")
            )
            if image_url is None:
                images = item.get("images")
                if isinstance(images, list):
                    image_url = next(
                        (url for image in images if (url := self._image_url(image))), None
                    )
            place = item.get("address") if kind == "listing" else item.get("location_name")
            description = item.get("description")
            subtitle = place if isinstance(place, str) and place.strip() else description
            if not isinstance(subtitle, str):
                subtitle = None
            if subtitle:
                subtitle = " ".join(subtitle.split())[:140]
            price_label = None
            if kind == "product":
                price = item.get("price")
                currency = item.get("currency")
                if price is not None and isinstance(currency, str):
                    price_label = f"{price} {currency}"
            else:
                price_options = result.get("lowest_price_options")
                price_data = (
                    price_options[0]
                    if isinstance(price_options, list) and price_options
                    else item.get("starting_price")
                )
                if isinstance(price_data, dict):
                    amount = price_data.get("total_price_per_night", price_data.get("amount"))
                    currency = price_data.get("currency")
                    if amount is not None and isinstance(currency, str):
                        price_label = f"от {amount} {currency}/ночь"
            rating = item.get("average_overall_rating" if kind == "listing" else "average_rating")
            try:
                rating_value = float(rating) if rating is not None else None
            except (TypeError, ValueError):
                rating_value = None
            rating_label = f"{rating_value:.1f}" if rating_value is not None else None
            review_count = item.get(
                "published_review_count" if kind == "listing" else "review_count"
            )
            if rating_label and isinstance(review_count, int) and review_count > 0:
                rating_label = f"{rating_label} · {review_count}"
            recommendation = AssistantRecommendation(
                kind=kind,
                id=str(item_id),
                title=title.strip()[:160],
                image_url=image_url,
                subtitle=subtitle,
                price_label=price_label,
                rating_label=rating_label,
            )
            self._items[(kind, recommendation.id)] = recommendation
            added += 1
            if added >= limit:
                break

    def recommendations(self) -> tuple[AssistantRecommendation, ...]:
        return tuple(self._items.values())[: self._limit]


class PendingActionCollector:
    def __init__(self):
        self.action: dict[str, Any] | None = None


class DestinationContext:
    """Share an unambiguous destination lookup with accommodation search this turn."""

    def __init__(self) -> None:
        self.location_id: int | None = None

    def set_if_unambiguous(self, locations: list[dict]) -> None:
        ids = {
            item.get("id")
            for item in locations
            if isinstance(item.get("id"), int) and item.get("id") > 0
        }
        self.location_id = next(iter(ids)) if len(ids) == 1 else None


class AvailableUnitsTool(Tool):
    name = "check_available_rooms"
    description = (
        "Check currently available bookable units for the exact accommodation and dates. "
        "Use when the user is ready to book, and have the user choose a unit if there are several."
    )
    inputs = {
        "listing_id": {"type": "string", "description": "Exact OTA accommodation UUID."},
        "check_in_date": {"type": "string", "description": "YYYY-MM-DD."},
        "nights": {"type": "integer", "description": "Number of nights."},
        "has_pets": {"type": "boolean", "description": "Whether guests bring a pet."},
        "currency": {
            "type": "string",
            "nullable": True,
            "description": "Three-letter currency code, default RUB.",
        },
    }
    output_type = "string"

    def __init__(self, ota: OTAClient):
        super().__init__()
        self._ota = ota

    def forward(
        self,
        listing_id: str,
        check_in_date: str,
        nights: int,
        has_pets: bool,
        currency: str = "RUB",
    ) -> str:
        return compact_json(
            self._ota.available_units(listing_id, check_in_date, nights, has_pets, currency.upper())
        )


class PrepareBookingConfirmationTool(Tool):
    name = "prepare_booking_confirmation"
    description = (
        "Prepare an exact booking proposal for the current authenticated user. Use only after "
        "the user selected a listing and unit and supplied all stay and guest details. This does "
        "not create a booking; it stores immutable details and the application asks "
        "for confirmation."
    )
    inputs = {
        "listing_id": {"type": "string", "description": "Exact OTA accommodation UUID."},
        "unit_ids": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Unit UUIDs chosen by the user from current availability.",
        },
        "check_in_date": {"type": "string", "description": "YYYY-MM-DD."},
        "nights": {"type": "integer", "description": "Number of nights."},
        "adults_count": {"type": "integer", "description": "Number of adults."},
        "children_count": {"type": "integer", "description": "Number of children."},
        "has_pets": {"type": "boolean", "description": "Whether guests bring a pet."},
        "currency": {
            "type": "string",
            "nullable": True,
            "description": "Three-letter currency code, default RUB.",
        },
    }
    output_type = "string"

    def __init__(self, ota: OTAClient, collector: PendingActionCollector):
        super().__init__()
        self._ota = ota
        self._collector = collector

    def forward(
        self,
        listing_id: str,
        unit_ids: list[str],
        check_in_date: str,
        nights: int,
        adults_count: int,
        children_count: int,
        has_pets: bool,
        currency: str = "RUB",
    ) -> str:
        if (
            not unit_ids
            or len(set(unit_ids)) != len(unit_ids)
            or len(unit_ids) > 100
            or adults_count < 0
            or children_count < 0
            or adults_count + children_count < 1
        ):
            return (
                "Cannot prepare the booking: select an available unit and provide "
                "a valid guest composition."
            )
        available = self._ota.available_units(
            listing_id, check_in_date, nights, has_pets, currency.upper()
        )
        by_id = {str(unit.get("id")): unit for unit in available}
        if any(unit_id not in by_id for unit_id in unit_ids):
            return (
                "Cannot prepare the booking: one or more selected units are no longer available. "
                "Check availability again."
            )
        selected = [by_id[unit_id] for unit_id in unit_ids]
        if sum(int(unit.get("capacity_adults", 0)) for unit in selected) < adults_count:
            return "Cannot prepare the booking: selected units do not fit the number of adults."
        if sum(int(unit.get("capacity_children", 0)) for unit in selected) < children_count:
            return "Cannot prepare the booking: selected units do not fit the number of children."
        listing = self._ota.listing(listing_id)
        title = str(listing.get("title_ru") or listing.get("title") or "Выбранное жильё")
        unit_names = ", ".join(
            str(unit.get("name_ru") or unit.get("name") or "номер") for unit in selected
        )
        guest_parts = [f"взрослых: {adults_count}"]
        if children_count:
            guest_parts.append(f"детей: {children_count}")
        if has_pets:
            guest_parts.append("с питомцем")
        summary = (
            f"{title}, {unit_names}; заезд {check_in_date}, {nights} ноч.; {', '.join(guest_parts)}"
        )
        self._collector.action = {
            "type": "booking",
            "summary": summary,
            "booking": {
                "listing_id": listing_id,
                "unit_ids": unit_ids,
                "check_in_date": check_in_date,
                "nights": nights,
                "adults_count": adults_count,
                "children_count": children_count,
                "has_pets": has_pets,
                "currency": currency.upper(),
            },
        }
        return "Proposal saved. The application will ask the user to confirm these exact details."


class CalendarDateCollector:
    def __init__(self) -> None:
        self.resolved_date: str | None = None


class CalendarTool(Tool):
    name = "resolve_calendar_date"
    description = (
        "Get the authoritative current date in the configured OTA timezone and resolve a "
        "date phrase such as today, tomorrow, a named date, a date range (e.g. с 5 по 10 ноября), "
        "or the nearest weekday. Use before asking for or preparing any booking date. The tool "
        "computes weekdays, nights, and whether the date is in the past."
    )
    inputs = {
        "date_phrase": {
            "type": "string",
            "description": (
                "The user's date expression, e.g. с 5 по 10 ноября, 15.11, "
                "завтра, ближайшее воскресенье."
            ),
        }
    }
    output_type = "string"

    def __init__(self, timezone: str, collector: CalendarDateCollector):
        super().__init__()
        self._timezone = ZoneInfo(timezone)
        self._collector = collector

    @staticmethod
    def _parse_single_date(
        text: str, today: date, month_names: dict[str, int], weekdays: dict[str, int]
    ) -> date | None:
        raw = text.strip()
        iso_match = re.search(r"\b(\d{4})-(\d{1,2})-(\d{1,2})\b", raw)
        if iso_match:
            try:
                return date(
                    int(iso_match.group(1)), int(iso_match.group(2)), int(iso_match.group(3))
                )
            except ValueError:
                return None

        dot_match = re.search(r"\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b", raw)
        if dot_match:
            day, month = int(dot_match.group(1)), int(dot_match.group(2))
            raw_year = dot_match.group(3)
            year = int(raw_year) if raw_year else today.year
            if raw_year and len(raw_year) == 2:
                year += 2000
            try:
                d = date(year, month, day)
                if not raw_year and d < today and month < today.month:
                    d = date(year + 1, month, day)
                return d
            except ValueError:
                return None

        named_match = re.search(r"\b(\d{1,2})\s+([a-zа-я]+)(?:\s+(\d{4}))?\b", raw)
        if named_match and named_match.group(2) in month_names:
            day = int(named_match.group(1))
            month = month_names[named_match.group(2)]
            year = int(named_match.group(3) or today.year)
            try:
                d = date(year, month, day)
                if not named_match.group(3) and d < today and month < today.month:
                    d = date(year + 1, month, day)
                return d
            except ValueError:
                return None

        if raw in {"сегодня", "today"}:
            return today
        if raw in {"завтра", "tomorrow"}:
            return today + timedelta(days=1)
        if raw in {"послезавтра", "day after tomorrow"}:
            return today + timedelta(days=2)

        in_days = re.search(r"(?:через|in)\s+(\d+)\s*(?:дн\w*|day\w*)", raw)
        if in_days:
            return today + timedelta(days=int(in_days.group(1)))

        if "через неделю" in raw or "in a week" in raw:
            return today + timedelta(days=7)

        if any(w in raw for w in ("выходн", "weekend")):
            days_ahead = (5 - today.weekday()) % 7
            if days_ahead == 0:
                days_ahead = 7
            return today + timedelta(days=days_ahead)

        for word, weekday in weekdays.items():
            if word in raw:
                days = (weekday - today.weekday()) % 7
                if days == 0 and ("след" in raw or "next" in raw or word in raw):
                    days = 7
                return today + timedelta(days=days)
        return None

    def forward(self, date_phrase: str) -> str:
        today = datetime.now(self._timezone).date()
        phrase = date_phrase.casefold().strip().replace("ё", "е")
        weekdays = {
            "понедельник": 0,
            "понедельника": 0,
            "monday": 0,
            "вторник": 1,
            "вторника": 1,
            "tuesday": 1,
            "среда": 2,
            "среду": 2,
            "среды": 2,
            "wednesday": 2,
            "четверг": 3,
            "четверга": 3,
            "thursday": 3,
            "пятница": 4,
            "пятницу": 4,
            "пятницы": 4,
            "friday": 4,
            "суббота": 5,
            "субботу": 5,
            "субботы": 5,
            "saturday": 5,
            "воскресенье": 6,
            "воскресенья": 6,
            "воскресению": 6,
            "sunday": 6,
        }
        month_names = {
            "января": 1,
            "январь": 1,
            "january": 1,
            "февраля": 2,
            "февраль": 2,
            "february": 2,
            "марта": 3,
            "март": 3,
            "march": 3,
            "апреля": 4,
            "апрель": 4,
            "april": 4,
            "мая": 5,
            "май": 5,
            "may": 5,
            "июня": 6,
            "июнь": 6,
            "june": 6,
            "июля": 7,
            "июль": 7,
            "july": 7,
            "августа": 8,
            "август": 8,
            "august": 8,
            "сентября": 9,
            "сентябрь": 9,
            "september": 9,
            "октября": 10,
            "октябрь": 10,
            "october": 10,
            "ноября": 11,
            "ноябрь": 11,
            "november": 11,
            "декабря": 12,
            "декабрь": 12,
            "december": 12,
        }

        # Check for range: e.g. "с 5 по 10 ноября", "с 10.11 по 15.11"
        range_match = re.search(r"(?:с|from)\s+(.+?)\s+(?:по|до|to|-)\s+(.+)", phrase)
        if not range_match:
            dash_match = re.search(
                r"(\d{1,2})\s*[-–—]\s*(\d{1,2}\s+[a-zа-я]+(?:\s+\d{4})?)", phrase
            )
            if dash_match:
                start_part = dash_match.group(1)
                end_part = dash_match.group(2)
                end_month_match = re.search(r"[a-zа-я]+", end_part)
                if end_month_match:
                    start_part = f"{start_part} {end_month_match.group()}"
                range_match = (start_part, end_part)  # type: ignore

        if range_match:
            if isinstance(range_match, tuple):
                start_str, end_str = range_match
            else:
                start_str, end_str = range_match.group(1), range_match.group(2)
            d_end = self._parse_single_date(end_str, today, month_names, weekdays)
            d_start = self._parse_single_date(start_str, today, month_names, weekdays)
            if not d_start and d_end:
                day_match = re.match(r"^\s*(\d{1,2})\s*$", start_str)
                if day_match:
                    try:
                        d_start = date(d_end.year, d_end.month, int(day_match.group(1)))
                    except ValueError:
                        d_start = None
            if d_start and d_end and d_end > d_start:
                nights = (d_end - d_start).days
                status = "past" if d_start < today else "today" if d_start == today else "future"
                self._collector.resolved_date = d_start.isoformat()
                return (
                    f"Current date: {today.isoformat()} ({today.strftime('%A')}); "
                    f"resolved check-in date: {d_start.isoformat()} ({d_start.strftime('%A')}); "
                    f"resolved check-out date: {d_end.isoformat()} ({d_end.strftime('%A')}); "
                    f"nights: {nights}; status: {status}; timezone: {self._timezone.key}."
                )

        resolved = self._parse_single_date(phrase, today, month_names, weekdays)
        if resolved is None:
            return (
                f"Current date is {today.isoformat()} ({today.strftime('%A')}) in "
                f"{self._timezone.key}. Could not resolve the phrase; ask for a specific date."
            )
        status = "past" if resolved < today else "today" if resolved == today else "future"
        self._collector.resolved_date = resolved.isoformat()
        return (
            f"Current date: {today.isoformat()} ({today.strftime('%A')}); "
            f"resolved date: {resolved.isoformat()} ({resolved.strftime('%A')}); "
            f"status: {status}; timezone: {self._timezone.key}."
        )


class PrepareProductOrderTool(Tool):
    name = "prepare_product_order_confirmation"
    description = (
        "Prepare adding a selected product to the authenticated user's pending order/cart. "
        "This does not change the cart; the application saves the exact proposal and "
        "asks for confirmation."
    )
    inputs = {
        "product_id": {"type": "string", "description": "Exact OTA product UUID."},
        "quantity": {
            "type": "integer",
            "description": "Quantity explicitly requested by the user.",
        },
        "product_date": {
            "type": "string",
            "nullable": True,
            "description": "YYYY-MM-DD when required by the product schedule.",
        },
        "currency": {
            "type": "string",
            "nullable": True,
            "description": "Three-letter currency code, default RUB.",
        },
    }
    output_type = "string"

    def __init__(
        self,
        ota: OTAClient,
        collector: PendingActionCollector,
        timezone: str,
        calendar: CalendarDateCollector,
    ):
        super().__init__()
        self._ota = ota
        self._collector = collector
        self._timezone = ZoneInfo(timezone)
        self._calendar = calendar

    def forward(
        self,
        product_id: str,
        quantity: int,
        product_date: str | None = None,
        currency: str = "RUB",
    ) -> str:
        if quantity < 1 or quantity > 10:
            return "Cannot prepare the order: quantity must be between 1 and 10."
        product = self._ota.product(product_id)
        schedule = product.get("schedule") or []
        if schedule and not product_date:
            product_date = self._calendar.resolved_date
        if schedule and not product_date:
            return "Ask the user for the tour date before preparing the order, then stop."
        if product_date:
            if product.get("product_type") != "tour" or not schedule:
                return "This product does not accept a date. Prepare it without a date."
            try:
                selected_date = date.fromisoformat(product_date)
            except ValueError:
                return "The product date must use YYYY-MM-DD. Ask the user to clarify it."
            if selected_date < datetime.now(self._timezone).date():
                return "The selected product date is in the past. Ask the user for a future date."
            weekday = selected_date.isoweekday()
            if not any(int(entry.get("weekday", 0)) == weekday for entry in schedule):
                return (
                    "The selected date is not in this tour's schedule. "
                    "Ask the user to choose another date."
                )
        title = str(
            product.get("name_ru")
            or product.get("name")
            or product.get("title")
            or "Выбранный продукт"
        )
        self._collector.action = {
            "type": "product",
            "summary": f"{title}, количество: {quantity}"
            + (f", дата: {product_date}" if product_date else ""),
            "product": {
                "product_id": product_id,
                "quantity": quantity,
                "date": product_date,
                "currency": currency.upper(),
            },
        }
        return "Proposal saved. The application will ask the user to confirm these exact details."


class SearchListingsTool(Tool):
    name = "search_accommodations"
    description = (
        "Search active OTA accommodation listings in the destination requested by the guest. "
        "For a specifically named property, pass its name in query; results are filtered by "
        "listing name, description, and address. If no exact match exists, do not substitute "
        "other listings without asking. "
        "Search results may include review_summary and rating data. For listings, "
        "published_review_count is the total number of visible published reviews; "
        "overall_rating_count counts only reviews with an overall score. Use the former for "
        "review counts in answers. Use review_summary when present to assess guest-reported "
        "strengths and weaknesses; do not infer review themes when it is missing. "
        "When dates and party size are known, pass stay parameters to get current "
        "availability and prices. You can sort by price or rating and filter by min_rating."
    )
    inputs = {
        "location_id": {
            "type": "integer",
            "nullable": True,
            "description": "OTA location ID for the destination.",
        },
        "query": {
            "type": "string",
            "nullable": True,
            "description": (
                "Optional exact accommodation name requested by the guest. Use only for a "
                "specific property name, not for city or lodging type."
            ),
        },
        "listing_type_id": {
            "type": "integer",
            "nullable": True,
            "description": (
                "Exact type ID returned by search_accommodation_types, e.g. for hotel or hostel."
            ),
        },
        "min_rating": {
            "type": "number",
            "nullable": True,
            "description": (
                "Optional minimum average guest rating score (1.0 to 10.0, e.g. 8.0, 7.5). "
                "Use when the guest explicitly requests good reviews or high-rated accommodations."
            ),
        },
        "sort_by": {
            "type": "string",
            "nullable": True,
            "description": (
                "Optional sort order: 'price_asc' (cheapest first), 'price_desc', "
                "'rating_desc' (highest rated first), or 'rating_asc'."
            ),
        },
        "result_limit": {
            "type": "integer",
            "nullable": True,
            "description": (
                "Number of cards to return, 1–6. Match an explicit quantity requested by the "
                "guest; otherwise use 3."
            ),
        },
        "max_distance_km": {
            "type": "number",
            "nullable": True,
            "description": (
                "Optional maximum distance from the destination centre in kilometres. "
                "For a guest asking for a central location, use 1 to 5."
            ),
        },
        "check_in_date": {
            "type": "string",
            "nullable": True,
            "description": "Check-in date YYYY-MM-DD, or empty for catalog-only search.",
        },
        "nights": {
            "type": "integer",
            "nullable": True,
            "description": "Number of nights; required with check-in date.",
        },
        "adults_count": {
            "type": "integer",
            "nullable": True,
            "description": "Adult guests; required with check-in date.",
        },
        "children_count": {
            "type": "integer",
            "nullable": True,
            "description": "Children count, default 0.",
        },
        "has_pets": {
            "type": "boolean",
            "nullable": True,
            "description": "Whether the party travels with pets.",
        },
        "currency": {
            "type": "string",
            "nullable": True,
            "description": "Three-letter currency code, default RUB.",
        },
    }
    output_type = "string"

    def __init__(
        self,
        ota: OTAClient,
        collector: RecommendationCollector | None = None,
        required_listing_type_ids: list[int] | None = None,
        required_result_limit: int | None = None,
        required_location_id: int | None = None,
        required_max_distance_km: float | None = None,
        destination_context: DestinationContext | None = None,
    ):
        super().__init__()
        self._ota = ota
        self._collector = collector
        self._required_listing_type_ids = required_listing_type_ids
        self._required_result_limit = required_result_limit
        self._required_location_id = required_location_id
        self._required_max_distance_km = required_max_distance_km
        self._destination_context = destination_context

    def forward(
        self,
        location_id: int | None = None,
        query: str | None = None,
        listing_type_id: int | None = None,
        min_rating: float | None = None,
        sort_by: str | None = None,
        result_limit: int = 3,
        max_distance_km: float | None = None,
        check_in_date: str | None = None,
        nights: int | None = None,
        adults_count: int | None = None,
        children_count: int | None = None,
        has_pets: bool | None = None,
        currency: str | None = None,
    ) -> str:
        selected_location_id = (
            location_id
            or (self._destination_context.location_id if self._destination_context else None)
            or self._required_location_id
        )
        if selected_location_id is None or selected_location_id < 1:
            raise ValueError("A valid destination location is required")
        if listing_type_id:
            listing_type_ids = [listing_type_id]
        elif self._required_listing_type_ids:
            listing_type_ids = self._required_listing_type_ids
        else:
            listing_type_ids = None

        sort_criteria = None
        if sort_by:
            s = sort_by.strip().lower()
            if s in {"price_asc", "cheapest", "price"}:
                sort_criteria = {"price": "asc"}
            elif s in {"price_desc", "expensive"}:
                sort_criteria = {"price": "desc"}
            elif s in {"rating_desc", "best", "top_rated", "rating"}:
                sort_criteria = {"rating": "desc"}
            elif s in {"rating_asc"}:
                sort_criteria = {"rating": "asc"}

        effective_max_distance = (
            max_distance_km if max_distance_km is not None else self._required_max_distance_km
        )
        results = self._ota.search_listings(
            location_id=selected_location_id,
            listing_type_ids=listing_type_ids,
            check_in_date=check_in_date or None,
            nights=nights or None,
            adults_count=adults_count or None,
            children_count=children_count or 0,
            has_pets=has_pets or False,
            currency=(currency or "RUB").upper(),
            max_distance_km=effective_max_distance,
            min_overall_rating=min_rating,
            sort=sort_criteria,
        )
        if query and query.strip():
            raw_query = query.strip().casefold()
            stop_words = {
                "отель",
                "гостиница",
                "хостел",
                "апартаменты",
                "апартамент",
                "номер",
                "койка",
                "hotel",
                "hostel",
                "apartment",
                "apartments",
                "inn",
                "motel",
                "в",
                "на",
                "у",
                "и",
                "с",
                "со",
                "по",
                "для",
                "от",
                "до",
                "the",
                "a",
                "an",
                "at",
            }
            all_tokens = re.findall(r"[^\W_]+", raw_query)
            significant_tokens = [t for t in all_tokens if t not in stop_words and len(t) > 1]
            if not significant_tokens:
                significant_tokens = all_tokens

            def _matches_listing(item: dict) -> bool:
                listing_obj = item.get("listing") or item
                text_to_search = " ".join(
                    str(value)
                    for value in (
                        listing_obj.get("title"),
                        listing_obj.get("title_ru"),
                        listing_obj.get("description"),
                        listing_obj.get("description_ru"),
                        listing_obj.get("address"),
                        listing_obj.get("address_ru"),
                    )
                    if value
                ).casefold()

                if raw_query in text_to_search:
                    return True

                matched_count = 0
                for token in significant_tokens:
                    stem = _word_stem(token) if len(token) >= 4 else token
                    if token in text_to_search or stem in text_to_search:
                        matched_count += 1
                if significant_tokens and matched_count >= len(significant_tokens):
                    return True
                if len(significant_tokens) >= 2 and matched_count >= len(significant_tokens) - 1:
                    return True
                return False

            matched_results = [item for item in results if _matches_listing(item)]
            if matched_results:
                results = matched_results
            else:
                partial = [
                    item
                    for item in results
                    if any(
                        t
                        in " ".join(
                            str(v)
                            for v in (
                                (item.get("listing") or item).get("title"),
                                (item.get("listing") or item).get("title_ru"),
                            )
                            if v
                        ).casefold()
                        for t in significant_tokens
                    )
                ]
                if partial:
                    results = partial
                else:
                    if self._collector:
                        self._collector.add("listing", [], replace=True)
                    return (
                        f'No accommodation matched the exact requested name "{query.strip()}". '
                        "Tell the guest the named property was not found and ask whether they want "
                        "to see other options of the requested type."
                    )
        effective_limit = self._required_result_limit or min(max(result_limit or 3, 1), 3)
        if not results and check_in_date:
            catalog_results = self._ota.search_listings(
                location_id=selected_location_id,
                listing_type_ids=listing_type_ids,
                check_in_date=None,
                nights=None,
                adults_count=None,
                children_count=0,
                has_pets=False,
                currency=(currency or "RUB").upper(),
                max_distance_km=effective_max_distance,
                min_overall_rating=min_rating,
                sort=sort_criteria,
            )
            if self._collector:
                self._collector.add("listing", [], limit=effective_limit, replace=True)
            return compact_json(
                {
                    "available_for_requested_dates": [],
                    "matching_catalog_listings": catalog_results[:effective_limit],
                },
                max_chars=None,
            )
        if self._collector:
            self._collector.add("listing", results, limit=effective_limit, replace=True)
        return compact_json(results[: max(1, min(effective_limit, 6))], max_chars=None)


class SearchListingTypesTool(Tool):
    name = "search_accommodation_types"
    description = (
        "Find exact OTA accommodation type IDs, for example hostel or hotel. "
        "Use this before searching when the guest requests a particular type."
    )
    inputs = {"query": {"type": "string", "description": "Requested lodging type, e.g. хостел."}}
    output_type = "string"

    def __init__(self, ota: OTAClient):
        super().__init__()
        self._ota = ota

    def forward(self, query: str) -> str:
        return compact_json(self._ota.search_listing_types(query))


class SearchLocationsTool(Tool):
    name = "search_destinations"
    description = (
        "Find OTA destination location IDs by city or region name before searching accommodations. "
        "Do not use for accommodation names, hotel brands, addresses, room names, or bed names."
    )
    inputs = {
        "query": {"type": "string", "description": "Destination name in the guest's language."}
    }
    output_type = "string"

    def __init__(self, ota: OTAClient, destination_context: DestinationContext | None = None):
        super().__init__()
        self._ota = ota
        self._destination_context = destination_context

    def forward(self, query: str) -> str:
        locations = self._ota.search_locations(query)
        if self._destination_context is not None:
            self._destination_context.set_if_unambiguous(locations)
        return compact_json(
            [{"id": item.get("id"), "name": item.get("name")} for item in locations]
        )


class GetListingTool(Tool):
    name = "get_accommodation_details"
    description = (
        "Get the current OTA catalog card for one accommodation using its exact listing UUID."
    )
    inputs = {"listing_id": {"type": "string", "description": "OTA listing UUID."}}
    output_type = "string"

    def __init__(self, ota: OTAClient, collector: RecommendationCollector | None = None):
        super().__init__()
        self._ota = ota
        self._collector = collector

    def forward(self, listing_id: str) -> str:
        listing = self._ota.listing(listing_id)
        if self._collector:
            self._collector.add("listing", [listing])
        return compact_json(listing)


class SearchProductsTool(Tool):
    name = "search_products"
    description = (
        "Search active OTA products, tours, goods, and services by query and optional location. "
        "When location and product type are supplied, search that location and type first; "
        "use text matches only as supplementary results so wording or inflection does not hide "
        "relevant products."
    )
    inputs = {
        "query": {"type": "string", "description": "Short product or activity query."},
        "location_id": {
            "type": "integer",
            "nullable": True,
            "description": "Optional OTA location ID; use 0 when omitted.",
        },
        "product_type": {
            "type": "string",
            "nullable": True,
            "description": "Optional: tour, goods, or service; empty when omitted.",
        },
        "currency": {
            "type": "string",
            "nullable": True,
            "description": "Three-letter currency code, default RUB.",
        },
        "result_limit": {
            "type": "integer",
            "nullable": True,
            "description": (
                "Number of product cards to return, 1–6; use the quantity explicitly requested "
                "by the guest, otherwise 3."
            ),
        },
    }
    output_type = "string"

    def __init__(
        self,
        ota: OTAClient,
        collector: RecommendationCollector | None = None,
        required_result_limit: int | None = None,
        required_location_id: int | None = None,
        required_product_type: str | None = None,
        language: str = "en",
    ):
        super().__init__()
        self._ota = ota
        self._collector = collector
        self._required_result_limit = required_result_limit
        self._required_location_id = required_location_id
        self._required_product_type = required_product_type
        self._language = language if language in {"en", "ru"} else "en"

    def forward(
        self,
        query: str,
        location_id: int | None = None,
        product_type: str | None = None,
        currency: str | None = None,
        result_limit: int = 3,
    ) -> str:
        effective_limit = self._required_result_limit or result_limit or 3
        selected_location_id = location_id or self._required_location_id or None
        selected_product_type = product_type or self._required_product_type or None
        effective_currency = (currency or "RUB").upper()
        if selected_location_id is not None and selected_product_type:
            results = self._ota.search_products(
                "",
                selected_location_id,
                selected_product_type,
                effective_currency,
                self._language,
            )
            if query.strip():
                text_results = self._ota.search_products(
                    query,
                    selected_location_id,
                    selected_product_type,
                    effective_currency,
                    self._language,
                )
                merged_results = []
                seen_ids = set()
                for product in [*results, *text_results]:
                    product_id = product.get("id")
                    key = str(product_id) if product_id is not None else None
                    if key is None or key not in seen_ids:
                        merged_results.append(product)
                        if key is not None:
                            seen_ids.add(key)
                results = merged_results
        else:
            results = self._ota.search_products(
                query,
                selected_location_id,
                selected_product_type,
                effective_currency,
                self._language,
            )
        if self._collector:
            self._collector.add("product", results, limit=effective_limit, replace=True)
        return compact_json(results[: max(1, min(effective_limit, 6))])


class GetProductTool(Tool):
    name = "get_product_details"
    description = "Get the current OTA catalog card for one product using its exact product UUID."
    inputs = {"product_id": {"type": "string", "description": "OTA product UUID."}}
    output_type = "string"

    def __init__(self, ota: OTAClient, collector: RecommendationCollector | None = None):
        super().__init__()
        self._ota = ota
        self._collector = collector

    def forward(self, product_id: str) -> str:
        product = self._ota.product(product_id)
        if self._collector:
            self._collector.add("product", [product])
        return compact_json(product)


class SearchWeatherForecastTool(Tool):
    name = "search_weather_forecast"
    description = (
        "Search the Internet for a trip weather forecast only on weather.com, gismeteo.ru, "
        "and yandex.ru/pogoda. Use when a verified OTA location and trip dates are known."
    )
    inputs = {
        "location": {"type": "string", "description": "Verified OTA location name."},
        "start_date": {"type": "string", "description": "Trip start date in YYYY-MM-DD format."},
        "end_date": {"type": "string", "description": "Trip end date in YYYY-MM-DD format."},
    }
    output_type = "string"

    def __init__(self, web_search: WeatherWebSearch):
        super().__init__()
        self._web_search = web_search

    def forward(self, location: str, start_date: str, end_date: str) -> str:
        if not location.strip():
            raise ValueError("A verified OTA location is required")
        try:
            start = date.fromisoformat(start_date)
            end = date.fromisoformat(end_date)
        except ValueError as exc:
            raise ValueError("Dates must use YYYY-MM-DD format") from exc
        if end < start:
            raise ValueError("The end date must not be earlier than the start date")
        try:
            results = self._web_search.search_forecast(
                location.strip(), start.isoformat(), end.isoformat()
            )
        except Exception:
            logger.exception("weather web search failed location=%s", location)
            return "Weather lookup failed. No forecast could be verified."
        if not results:
            return "No weather forecast was found on the approved weather sites."
        return json.dumps(results, ensure_ascii=False, separators=(",", ":"))


class BoundedToolCallingAgent(ToolCallingAgent):
    """Limit repeated product-order preparation calls in a single assistant response."""

    def __init__(
        self, *args: Any, product_order_call_limit: int = 2, limit_message: str, **kwargs: Any
    ):
        super().__init__(*args, **kwargs)
        self._product_order_call_limit = product_order_call_limit
        self._product_order_calls = 0
        self._limit_message = limit_message

    def process_tool_calls(self, chat_message: Any, memory_step: Any):
        calls = chat_message.tool_calls or []
        if any(call.function.name == "search_destinations" for call in calls) and any(
            call.function.name == "search_accommodations" for call in calls
        ):
            # smolagents executes calls from one model response concurrently. Defer the
            # accommodation search so it can consume the destination lookup result.
            chat_message.tool_calls = [
                call for call in calls if call.function.name != "search_accommodations"
            ]
            calls = chat_message.tool_calls
        order_calls = [
            call for call in calls if call.function.name == "prepare_product_order_confirmation"
        ]
        if self._product_order_calls + len(order_calls) > self._product_order_call_limit:
            stop_call = order_calls[0]
            stop_call.function.name = "final_answer"
            stop_call.function.arguments = {"answer": self._limit_message}
            chat_message.tool_calls = [stop_call]
        else:
            self._product_order_calls += len(order_calls)
        yield from super().process_tool_calls(chat_message, memory_step)


class SmolagentsAssistant(AssistantPort):
    def __init__(self, settings: Settings, web_search: WeatherWebSearch):
        self._settings = settings
        self._web_search = web_search
        self._instructions = load_prompt("assistant.md")
        self._task_template = load_prompt("assistant_task.md")

    def respond(
        self, message: str, history: Sequence[tuple[str, str]], context: AssistantContext
    ) -> AssistantReply:
        if (
            self._settings.assistant_llm_api_key is None
            or not self._settings.assistant_llm_api_key.get_secret_value()
        ):
            raise RuntimeError("ASSISTANT_LLM_API_KEY is not configured")
        model_kwargs: dict[str, Any] = {
            "model_id": self._settings.assistant_llm_model_id,
            "api_key": self._settings.assistant_llm_api_key.get_secret_value(),
            "temperature": self._settings.assistant_llm_temperature,
        }
        if self._settings.assistant_llm_api_base:
            model_kwargs["api_base"] = self._settings.assistant_llm_api_base
        model = LiteLLMModel(**model_kwargs)
        ota = OTAClient(
            self._settings.ota_api_base_url,
            access_token=context.access_token,
        )
        first_name = None
        if context.access_token and not history:
            try:
                first_name = ota.profile_first_name()
            except Exception as exc:
                logger.info("assistant profile lookup unavailable: %s", type(exc).__name__)
        language_probe = (
            message
            if re.search(r"[A-Za-zА-Яа-яЁё]", message)
            else next((text for role, text in reversed(history) if role == "user"), message)
        )
        guest_language = "ru" if re.search(r"[А-Яа-яЁё]", language_probe) else "en"
        requested_result_limit = _requested_recommendation_limit(history, message)
        requested_location_id = _requested_location_id(ota, history, message)
        destination_context = DestinationContext()
        requested_product_type = _requested_product_type(history, message)
        collector = RecommendationCollector(limit=requested_result_limit or 3)
        requested_type = _requested_listing_type(history, message)
        requested_centre_radius_km = _requested_centre_radius_km(history, message)
        pending_action_collector = PendingActionCollector()
        calendar_date_collector = CalendarDateCollector()
        required_listing_type_ids = None
        if requested_type:
            aliases = LISTING_TYPE_CATALOG_ALIASES[requested_type]
            try:
                required_listing_type_ids = [
                    int(item["id"])
                    for item in ota.listing_types()
                    if any(
                        alias in f"{item.get('name', '')} {item.get('slug', '')}".casefold()
                        for alias in aliases
                    )
                    and isinstance(item.get("id"), int)
                ]
            except Exception as exc:
                logger.info("assistant listing type lookup unavailable: %s", type(exc).__name__)
                required_listing_type_ids = []
        tools: list[Tool] = [
            SearchLocationsTool(ota, destination_context),
            SearchListingTypesTool(ota),
            SearchListingsTool(
                ota,
                collector,
                required_listing_type_ids,
                requested_result_limit,
                requested_location_id,
                requested_centre_radius_km,
                destination_context,
            ),
            GetListingTool(ota, collector),
            AvailableUnitsTool(ota),
            SearchProductsTool(
                ota,
                collector,
                requested_result_limit,
                requested_location_id,
                requested_product_type,
                guest_language,
            ),
            GetProductTool(ota, collector),
            CalendarTool(self._settings.assistant_timezone, calendar_date_collector),
            SearchWeatherForecastTool(self._web_search),
        ]
        if context.access_token and context.user_id:
            tools.extend(
                [
                    PrepareBookingConfirmationTool(ota, pending_action_collector),
                    PrepareProductOrderTool(
                        ota,
                        pending_action_collector,
                        self._settings.assistant_timezone,
                        calendar_date_collector,
                    ),
                ]
            )
        agent = BoundedToolCallingAgent(
            tools=tools,
            model=model,
            instructions=self._instructions,
            max_steps=self._settings.chat_max_steps,
            add_base_tools=False,
            verbosity_level=LogLevel[self._settings.assistant_agent_log_level],
            product_order_call_limit=2,
            limit_message=(
                "Не удалось подготовить заказ после двух попыток. Проверьте дату тура и попробуйте "
                "ещё раз."
                if guest_language == "ru"
                else "I could not prepare the order after two attempts. Please check the tour date "
                "and try again."
            ),
        )
        previous = "\n".join(f"{role}: {content}" for role, content in history)
        current_date = datetime.now(ZoneInfo(self._settings.assistant_timezone)).date()
        task = self._task_template.format(
            current_date=current_date.isoformat(),
            timezone=self._settings.assistant_timezone,
            history=previous or "Сообщений в этой сессии ещё нет.",
            is_new_session="да" if not history else "нет",
            is_authenticated="да" if context.user_id and context.access_token else "нет",
            profile_first_name=json.dumps(first_name, ensure_ascii=False),
            message=message,
        )
        result = agent.run(task)
        result_text = str(result).strip()
        if pending_action_collector.action is None and re.search(
            r"(?i)(?:подтверждаете|подтвердите).{0,80}(?:брон|заказ|корзин)|"
            r"(?:брон|заказ|корзин).{0,80}(?:подтверждаете|подтвердите)",
            result_text,
        ):
            result_text = (
                "Не удалось подготовить предложение с точными параметрами заказа. "
                "Уточните выбранный тур и дату, чтобы я проверил их и подготовил заказ."
            )
        return AssistantReply(
            message=_hide_internal_ids(result_text),
            recommendations=collector.recommendations(),
            pending_action=pending_action_collector.action,
        )
