import json
from datetime import UTC, datetime
from typing import Any

from smolagents import LiteLLMModel

from ai_service.config import Settings
from ai_service.domain.models import ReviewKind, ReviewSummary
from ai_service.infrastructure.prompt_loader import load_prompt, load_versioned_prompt

# These are the only review attributes that may be used to generate a summary.
# `created_at` is used below to select the sample, but is intentionally omitted
# from the model payload. The OTA API's `updated_at` is not a reliable recency field.
SUMMARY_FIELDS = (
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
)


class LLMReviewSummarizer:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._system_prompt, self._prompt_version = load_versioned_prompt("review_summary.md")
        self._task_template = load_prompt("review_summary_task.md")

    @property
    def model_id(self) -> str:
        return self._settings.review_summary_llm_model_id

    @property
    def prompt_version(self) -> str:
        return self._prompt_version

    def summarize(
        self, kind: ReviewKind, target_id: str, reviews: list[dict[str, Any]]
    ) -> ReviewSummary:
        if (
            self._settings.review_summary_llm_api_key is None
            or not self._settings.review_summary_llm_api_key.get_secret_value()
        ):
            raise RuntimeError("REVIEW_SUMMARY_LLM_API_KEY is not configured")
        selected = sorted(reviews, key=self._created_at)[-50:]
        analysis_sample = self._analysis_sample(selected)
        serialized = json.dumps(analysis_sample, ensure_ascii=False, separators=(",", ":"))
        while selected and len(serialized) > 48_000:
            selected = selected[1:]
            analysis_sample = self._analysis_sample(selected)
            serialized = json.dumps(analysis_sample, ensure_ascii=False, separators=(",", ":"))
        if not selected:
            raise RuntimeError("The newest review exceeds the summarization input limit")
        kind_label = "accommodation" if kind == "listing" else "product"
        messages = [
            {
                "role": "system",
                "content": self._system_prompt,
            },
            {
                "role": "user",
                "content": self._task_template.format(
                    review_count=len(selected), kind=kind_label, reviews=serialized
                ),
            },
        ]
        kwargs: dict[str, Any] = {
            "model_id": self._settings.review_summary_llm_model_id,
            "api_key": self._settings.review_summary_llm_api_key.get_secret_value(),
            "temperature": self._settings.review_summary_llm_temperature,
        }
        if self._settings.review_summary_llm_api_base:
            kwargs["api_base"] = self._settings.review_summary_llm_api_base
        response = LiteLLMModel(**kwargs)(messages)
        text = getattr(response, "content", response)
        if not isinstance(text, str) or not text.strip():
            raise RuntimeError("The model returned an empty review summary")
        return ReviewSummary(
            kind=kind,
            target_id=target_id,
            text=text.strip(),
            source_review_count=len(selected),
            model_id=self.model_id,
            prompt_version=self._prompt_version,
            generated_at=datetime.now(UTC),
        )

    @staticmethod
    def _analysis_sample(reviews: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [
            {field: review[field] for field in SUMMARY_FIELDS if field in review}
            for review in reviews
        ]

    @staticmethod
    def _created_at(review: dict[str, Any]) -> datetime:
        value = review.get("created_at")
        if isinstance(value, datetime):
            created_at = value
        elif isinstance(value, str):
            try:
                created_at = datetime.fromisoformat(value.replace("Z", "+00:00"))
            except ValueError:
                created_at = datetime.min.replace(tzinfo=UTC)
        else:
            created_at = datetime.min.replace(tzinfo=UTC)
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=UTC)
        return created_at.astimezone(UTC)
