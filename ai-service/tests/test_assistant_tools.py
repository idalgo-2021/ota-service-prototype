from unittest.mock import MagicMock

from ai_service.infrastructure.assistant import (
    CalendarDateCollector,
    CalendarTool,
    DestinationContext,
    RecommendationCollector,
    SearchListingsTool,
)


def test_calendar_tool_relative_dates():
    collector = CalendarDateCollector()
    tool = CalendarTool("Asia/Bishkek", collector)

    res_today = tool.forward("сегодня")
    assert "status: today" in res_today
    assert collector.resolved_date is not None

    res_tomorrow = tool.forward("завтра")
    assert "status: future" in res_tomorrow

    res_in_days = tool.forward("через 3 дня")
    assert "status: future" in res_in_days

    res_in_week = tool.forward("через неделю")
    assert "status: future" in res_in_week


def test_calendar_tool_russian_dot_format():
    collector = CalendarDateCollector()
    tool = CalendarTool("Asia/Bishkek", collector)

    res_dot = tool.forward("15.11.2026")
    assert "2026-11-15" in res_dot
    assert collector.resolved_date == "2026-11-15"


def test_calendar_tool_date_range():
    collector = CalendarDateCollector()
    tool = CalendarTool("Asia/Bishkek", collector)

    res_range = tool.forward("с 5 по 10 ноября 2026")
    assert "resolved check-in date: 2026-11-05" in res_range
    assert "resolved check-out date: 2026-11-10" in res_range
    assert "nights: 5" in res_range
    assert collector.resolved_date == "2026-11-05"


def test_search_listings_precedence_and_sort():
    ota = MagicMock()
    ota.search_listings.return_value = [
        {
            "id": "item-1",
            "listing": {
                "id": "item-1",
                "title": "Отель Невский Гранд",
                "title_ru": "Отель Невский Гранд",
                "description": "Уютный отель в центре Санкт-Петербурга",
                "address": "Невский проспект, 10",
            },
        }
    ]
    collector = RecommendationCollector(limit=3)
    dest_ctx = DestinationContext()
    dest_ctx.location_id = 999  # Old context

    tool = SearchListingsTool(
        ota=ota,
        collector=collector,
        required_listing_type_ids=[1],
        required_result_limit=3,
        required_location_id=999,  # Old location from history
        required_max_distance_km=5.0,
        destination_context=dest_ctx,
    )

    # 1. Model explicitly provides location_id=42 and listing_type_id=2
    # Model's parameters must take precedence!
    res = tool.forward(
        location_id=42,
        listing_type_id=2,
        min_rating=8.5,
        sort_by="price_asc",
        max_distance_km=1.5,
        query="Невский",
    )

    ota.search_listings.assert_called_once()
    call_kwargs = ota.search_listings.call_args.kwargs
    assert call_kwargs["location_id"] == 42
    assert call_kwargs["listing_type_ids"] == [2]
    assert call_kwargs["min_overall_rating"] == 8.5
    assert call_kwargs["sort"] == {"price": "asc"}
    assert call_kwargs["max_distance_km"] == 1.5
    assert "item-1" in res


def test_search_listings_query_stop_words_filtering():
    ota = MagicMock()
    ota.search_listings.return_value = [
        {
            "id": "item-1",
            "title": "Nevsky Grand",
            "title_ru": "Невский Гранд",
            "description": "Hotel near Hermitage",
            "address": "Nevsky Prospekt",
        }
    ]
    tool = SearchListingsTool(ota=ota, required_location_id=1)

    # Query with generic word "гостиница" should still match "Невский Гранд"
    res = tool.forward(location_id=1, query="гостиница Невский")
    assert "item-1" in res
