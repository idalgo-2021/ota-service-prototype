import threading
import unicodedata
from datetime import datetime
from typing import Any

import httpx

from ai_service.domain.models import PublishedReview

LISTING_REVIEW_CONTENT_FIELDS = (
    "positive_review",
    "negative_review",
    "overall_rating",
    "cleanliness_rating",
    "staff_rating",
    "comfort_rating",
    "location_rating",
    "sleep_rating",
    "bathroom_rating",
    "wifi_rating",
    "trip_purpose",
    "party_type",
    "accommodation_type",
    "nights",
    "created_at",
)


class OTAClientError(RuntimeError):
    pass


class OTAClient:
    def __init__(
        self,
        base_url: str,
        email: str | None = None,
        password: str | None = None,
        timeout: float = 15.0,
        access_token: str | None = None,
    ):
        self._base_url = base_url.rstrip("/")
        self._email = email
        self._password = password
        self._fixed_access_token = access_token
        self._timeout = timeout
        self._access_token: str | None = None
        self._refresh_token: str | None = None
        self._auth_lock = threading.Lock()

    def _login(self) -> None:
        if not self._email or not self._password:
            raise OTAClientError("OTA service credentials are not configured")
        with httpx.Client(timeout=self._timeout) as client:
            response = client.post(
                f"{self._base_url}/api/v1/auth/login",
                json={
                    "email": self._email,
                    "password": self._password,
                },
            )
            response.raise_for_status()
            data = response.json().get("data", {})
        self._access_token = data.get("access_token")
        self._refresh_token = data.get("refresh_token")
        if not self._access_token:
            raise OTAClientError("OTA login response did not contain an access token")

    def _refresh(self) -> None:
        if not self._refresh_token:
            self._login()
            return
        with httpx.Client(timeout=self._timeout) as client:
            response = client.post(
                f"{self._base_url}/api/v1/auth/refresh",
                json={
                    "refresh_token": self._refresh_token,
                },
            )
            if response.is_error:
                self._login()
                return
            data = response.json().get("data", {})
        self._access_token = data.get("access_token")
        self._refresh_token = data.get("refresh_token", self._refresh_token)

    def _request(
        self, method: str, path: str, *, params: dict | None = None, body: dict | None = None
    ) -> Any:
        if self._fixed_access_token:
            access_token = self._fixed_access_token
        elif self._email and self._password and not self._access_token:
            with self._auth_lock:
                if not self._access_token:
                    self._login()
            access_token = self._access_token
        else:
            access_token = self._access_token
        headers = {"Authorization": f"Bearer {access_token}"} if access_token else {}
        with httpx.Client(timeout=self._timeout) as client:
            response = client.request(
                method, f"{self._base_url}{path}", params=params, json=body, headers=headers
            )
            if response.status_code == 401 and self._fixed_access_token:
                response.raise_for_status()
            if response.status_code == 401 and self._email and self._password:
                with self._auth_lock:
                    self._refresh()
                headers["Authorization"] = f"Bearer {self._access_token}"
                response = client.request(
                    method, f"{self._base_url}{path}", params=params, json=body, headers=headers
                )
            response.raise_for_status()
            return response.json()

    def search_listings(
        self,
        *,
        location_id: int | None,
        listing_type_ids: list[int] | None,
        check_in_date: str | None,
        nights: int | None,
        adults_count: int | None,
        children_count: int,
        has_pets: bool,
        currency: str,
        max_distance_km: float | None = None,
        min_overall_rating: float | None = None,
        sort: dict[str, str] | None = None,
    ) -> list[dict]:
        body: dict[str, Any] = {
            "availability_mode": "ignore",
            "location_ids": [location_id] if location_id else [],
        }
        if listing_type_ids:
            body["listing_type_ids"] = listing_type_ids
        if max_distance_km is not None:
            body["max_distance_km"] = max_distance_km
        if min_overall_rating is not None:
            body["min_overall_rating"] = min_overall_rating
        if sort:
            body["sort"] = sort
        if check_in_date:
            if nights is None or adults_count is None:
                raise ValueError("nights and adults_count are required when dates are provided")
            body.update(
                {
                    "availability_mode": "for_guests",
                    "check_in_date": check_in_date,
                    "nights": nights,
                    "adults_count": adults_count,
                    "children_count": children_count,
                    "has_pets": has_pets,
                    "currency": currency,
                }
            )
        payload = self._request("POST", "/api/v1/listings/search?lang=en", body=body)
        return payload.get("data", [])

    def listing_ids_within_center(self, location_name: str, max_distance_km: float) -> set[str]:
        normalized_name = unicodedata.normalize("NFKC", location_name).strip().casefold()
        locations = [
            item
            for item in self.locations()
            if any(
                unicodedata.normalize("NFKC", str(item.get(name_field, ""))).strip().casefold()
                == normalized_name
                for name_field in ("name", "name_ru")
            )
        ]
        location_ids = {item.get("id") for item in locations if isinstance(item.get("id"), int)}
        if len(location_ids) != 1:
            raise OTAClientError(f"Expected one OTA location matching {location_name!r}")
        location_id = next(iter(location_ids))
        results = self.search_listings(
            location_id=location_id,
            listing_type_ids=None,
            check_in_date=None,
            nights=None,
            adults_count=None,
            children_count=0,
            has_pets=False,
            currency="RUB",
            max_distance_km=max_distance_km,
        )
        listing_ids: set[str] = set()
        for item in results:
            listing = item.get("listing") or item
            listing_id = listing.get("id")
            distance = listing.get("distance_from_center_km")
            if not listing_id or distance is None:
                continue
            try:
                distance_km = float(distance)
            except (TypeError, ValueError):
                continue
            if distance_km < max_distance_km:
                listing_ids.add(str(listing_id))
        return listing_ids

    def search_listing_types(self, query: str) -> list[dict]:
        normalized = unicodedata.normalize("NFKC", query).strip().casefold()
        if not normalized:
            return []
        types = self._request("GET", "/api/v1/listing_types?lang=ru").get("data", [])
        return [
            item
            for item in types
            if normalized in str(item.get("name", "")).casefold()
            or normalized in str(item.get("slug", "")).casefold()
        ][:10]

    def listing_types(self) -> list[dict]:
        payload = self._request("GET", "/api/v1/listing_types?lang=ru")
        types = payload.get("data", [])
        return types if isinstance(types, list) else []

    def profile_first_name(self) -> str | None:
        payload = self._request("GET", "/api/v1/profile")
        profile = payload.get("data", {})
        if not isinstance(profile, dict):
            return None
        first_name = profile.get("first_name")
        if not isinstance(first_name, str):
            return None
        first_name = " ".join(first_name.split())[:100]
        return first_name or None

    def listing(self, listing_id: str) -> dict:
        return self._request("GET", f"/api/v1/listings/{listing_id}?lang=en").get("data", {})

    def available_units(
        self, listing_id: str, check_in_date: str, nights: int, has_pets: bool, currency: str
    ) -> list[dict]:
        payload = self._request(
            "GET",
            f"/api/v1/listings/{listing_id}/available-units",
            params={
                "check_in_date": check_in_date,
                "nights": nights,
                "has_pets": str(has_pets).lower(),
                "currency": currency,
                "sort_by": "price_per_night",
                "lang": "ru",
            },
        )
        data = payload.get("data", [])
        return data if isinstance(data, list) else []

    def product(self, product_id: str) -> dict:
        return self._request("GET", f"/api/v1/products/{product_id}?lang=ru").get("data", {})

    def create_booking(self, action: dict[str, Any]) -> dict:
        booking = action["booking"]
        available = self.available_units(
            booking["listing_id"],
            booking["check_in_date"],
            booking["nights"],
            booking["has_pets"],
            booking["currency"],
        )
        units = {str(item.get("id")): item for item in available}
        if any(unit_id not in units for unit_id in booking["unit_ids"]):
            raise OTAClientError("selected accommodation unit is no longer available")
        selected = [units[unit_id] for unit_id in booking["unit_ids"]]
        if sum(int(item.get("capacity_adults", 0)) for item in selected) < booking["adults_count"]:
            raise OTAClientError("selected accommodation units no longer fit the guest party")
        if (
            sum(int(item.get("capacity_children", 0)) for item in selected)
            < booking["children_count"]
        ):
            raise OTAClientError("selected accommodation units no longer fit the guest party")
        return self._request("POST", "/api/v1/bookings", body=booking).get("data", {})

    def add_product_to_pending_order(self, product: dict[str, Any]) -> dict:
        payload = self._request(
            "GET", "/api/v1/orders", params={"status": "pending", "limit": 100, "offset": 0}
        )
        orders = payload.get("data", [])
        if isinstance(orders, dict):
            orders = orders.get("items", [])
        order = next((item for item in orders if item.get("status") == "pending"), None)
        new_item = {
            "product_id": product["product_id"],
            "quantity": product["quantity"],
        }
        if product.get("date"):
            new_item["date"] = product["date"]
        if order:
            items = [
                {
                    "product_id": item["product_id"],
                    "quantity": item["quantity"],
                    **({"date": item["date"]} if item.get("date") else {}),
                }
                for item in order.get("items", [])
            ]
            matching = next(
                (
                    item
                    for item in items
                    if item["product_id"] == new_item["product_id"]
                    and item.get("date") == new_item.get("date")
                ),
                None,
            )
            if matching:
                matching["quantity"] += new_item["quantity"]
                if matching["quantity"] > 10:
                    raise OTAClientError("cart item quantity cannot exceed 10")
            else:
                items.append(new_item)
            return self._request(
                "PATCH",
                f"/api/v1/orders/{order['id']}",
                body={"items": items},
            ).get("data", {})
        return self._request(
            "POST",
            "/api/v1/orders",
            body={"items": [new_item], "currency": product.get("currency", "RUB")},
        ).get("data", {})

    def search_products(
        self,
        query: str,
        location_id: int | None,
        product_type: str | None,
        currency: str,
        language: str = "en",
    ) -> list[dict]:
        body: dict[str, Any] = {"query": query[:200], "currency": currency, "limit": 8}
        if location_id is not None:
            body["location_id"] = location_id
        if product_type:
            body["product_type"] = product_type
        if language not in {"en", "ru"}:
            language = "en"
        payload = self._request("POST", f"/api/v1/products/search?lang={language}", body=body)
        return payload.get("data", [])

    def search_locations(self, query: str) -> list[dict]:
        normalized = unicodedata.normalize("NFKC", query).strip().casefold()
        if not normalized:
            return []
        matches: dict[int, dict] = {}
        for language in ("ru", "en"):
            locations = self._dictionary_locations(language)
            for item in locations:
                name = unicodedata.normalize("NFKC", str(item.get("name", ""))).casefold()
                if normalized in name:
                    matches[item["id"]] = item
        return list(matches.values())[:10]

    def _dictionary_locations(self, language: str) -> list[dict]:
        payload = self._request("GET", f"/api/v1/dictionaries?lang={language}")
        data = payload.get("data", {})
        return data.get("locations", []) if isinstance(data, dict) else []

    def locations(self) -> list[dict]:
        matches: dict[int, dict] = {}
        for language in ("ru", "en"):
            locations = self._dictionary_locations(language)
            for item in locations:
                location_id = item.get("id")
                if location_id is None:
                    continue
                location = matches.setdefault(location_id, {})
                location.update({key: value for key, value in item.items() if key != "name"})
                location["name_ru" if language == "ru" else "name"] = item.get("name", "")
        return list(matches.values())

    def latest_listing_reviews(self, listing_id: str, limit: int) -> list[PublishedReview]:
        payload = self._request(
            "GET",
            "/api/v1/ai/reviews/listings",
            params={"listing_id": listing_id, "limit": min(max(limit, 1), 50)},
        )
        records = []
        for row in payload.get("data", []):
            target_id = row.get("listing_id")
            review_id = row.get("id")
            if str(target_id or "") != listing_id or not review_id:
                continue
            updated_at = datetime.fromisoformat(row["updated_at"].replace("Z", "+00:00"))
            content = {key: row[key] for key in LISTING_REVIEW_CONTENT_FIELDS if key in row}
            records.append(PublishedReview("listing", review_id, target_id, updated_at, content))
        return records

    def list_disappointment_candidates(self, limit: int = 100, offset: int = 0) -> dict[str, Any]:
        """Return one paginated OTA page for the hotelier disappointment detector."""
        if limit < 1 or offset < 0:
            raise ValueError("limit must be positive and offset must be non-negative")
        return self._request(
            "GET",
            "/api/v1/ai/listings/disappointment-candidates",
            params={"limit": limit, "offset": offset},
        )


def compact_json(value: Any, max_chars: int | None = 12000) -> str:
    import json

    result = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if max_chars is None:
        return result
    return result[:max_chars]
