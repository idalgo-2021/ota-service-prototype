import json
from datetime import UTC, datetime
from typing import Any

from smolagents import LiteLLMModel

from ai_service.config import Settings
from ai_service.domain.models import DisappointmentAnalysis, DisappointmentCandidate
from ai_service.infrastructure.prompt_loader import load_prompt, load_versioned_prompt


class LLMDisappointmentDetector:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._system_prompt, self._prompt_version = load_versioned_prompt(
            "disappointment_detector.md"
        )
        self._task_template = load_prompt("disappointment_detector_task.md")

    @property
    def model_id(self) -> str:
        return self._settings.review_summary_llm_model_id

    @property
    def prompt_version(self) -> str:
        return self._prompt_version

    def analyze(
        self, candidate: DisappointmentCandidate, rating_assessment: dict[str, Any]
    ) -> DisappointmentAnalysis:
        api_key = self._settings.review_summary_llm_api_key
        if api_key is None or not api_key.get_secret_value():
            raise RuntimeError("REVIEW_SUMMARY_LLM_API_KEY is not configured")

        serialized = json.dumps(
            {"candidate": candidate.payload, "rating_assessment": rating_assessment},
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        )
        messages = [
            {"role": "system", "content": self._system_prompt},
            {"role": "user", "content": self._task_template.format(input_data=serialized)},
        ]
        kwargs: dict[str, Any] = {
            "model_id": self.model_id,
            "api_key": api_key.get_secret_value(),
            "temperature": self._settings.review_summary_llm_temperature,
        }
        api_base = self._settings.review_summary_llm_api_base
        if api_base:
            kwargs["api_base"] = api_base
        response = LiteLLMModel(**kwargs)(messages)
        text = getattr(response, "content", response)
        result = self._parse_result(text)
        return DisappointmentAnalysis(
            listing_id=candidate.listing_id,
            source_hash=candidate.content_hash,
            result=result,
            model_id=self.model_id,
            prompt_version=self._prompt_version,
            generated_at=datetime.now(UTC),
        )

    @staticmethod
    def _parse_result(text: Any) -> dict[str, Any]:
        if not isinstance(text, str) or not text.strip():
            raise RuntimeError("The disappointment detector returned an empty response")
        start, end = text.find("{"), text.rfind("}")
        if start < 0 or end <= start:
            raise RuntimeError("The disappointment detector did not return a JSON object")
        try:
            result = json.loads(text[start : end + 1])
        except json.JSONDecodeError as exc:
            raise RuntimeError("The disappointment detector returned invalid JSON") from exc
        if not isinstance(result, dict):
            raise RuntimeError("The disappointment detector returned an invalid result")
        semantic_discrepancy = result.get("semantic_discrepancy")
        if isinstance(semantic_discrepancy, str):
            normalized_flag = semantic_discrepancy.strip().lower()
            if normalized_flag in {"true", "yes"}:
                semantic_discrepancy = True
            elif normalized_flag in {"false", "no"}:
                semantic_discrepancy = False
        if not isinstance(semantic_discrepancy, bool):
            raise RuntimeError("The disappointment detector returned an invalid discrepancy flag")
        result["semantic_discrepancy"] = semantic_discrepancy
        for field in (
            "evidence",
            "service_recommendations",
            "description_recommendations",
            "tag_recommendations",
        ):
            result[field] = LLMDisappointmentDetector._normalize_text_list(result.get(field))
        if not result["semantic_discrepancy"]:
            for field in ("description_recommendations", "tag_recommendations"):
                result[field] = []
        return result

    @staticmethod
    def _normalize_text_list(value: Any) -> list[str]:
        if value is None:
            return []
        values = value if isinstance(value, list) else [value]
        normalized = []
        for item in values:
            if isinstance(item, str):
                text = item.strip()
            elif isinstance(item, (dict, list)):
                text = json.dumps(item, ensure_ascii=False, separators=(",", ":"))
            else:
                text = str(item)
            if text:
                normalized.append(text)
        return normalized
