from urllib.parse import urlparse

from ddgs import DDGS


class WeatherWebSearch:
    """Search only the weather sites approved for assistant weather checks."""

    def search_forecast(
        self, location: str, start_date: str, end_date: str
    ) -> list[dict[str, str]]:
        queries = (
            f"site:weather.com {location} weather forecast {start_date} {end_date}",
            f"site:gismeteo.ru {location} прогноз погоды {start_date} {end_date}",
            f"site:yandex.ru/pogoda {location} прогноз погоды {start_date} {end_date}",
        )
        results: list[dict[str, str]] = []
        seen_urls: set[str] = set()
        with DDGS() as search:
            for query in queries:
                for item in search.text(query, max_results=3):
                    url = str(item.get("href", ""))
                    if not self._is_allowed_weather_url(url) or url in seen_urls:
                        continue
                    seen_urls.add(url)
                    results.append(
                        {
                            "title": str(item.get("title", ""))[:300],
                            "url": url,
                            "content": str(item.get("body", ""))[:2000],
                        }
                    )
        return results

    @staticmethod
    def _is_allowed_weather_url(url: str) -> bool:
        parsed = urlparse(url)
        hostname = (parsed.hostname or "").lower().rstrip(".")
        if hostname == "weather.com" or hostname.endswith(".weather.com"):
            return True
        if hostname == "gismeteo.ru" or hostname.endswith(".gismeteo.ru"):
            return True
        return hostname == "yandex.ru" and parsed.path.startswith("/pogoda")
