import asyncio
import logging

from ai_service.config import Settings
from ai_service.domain.models import DisappointmentCandidate
from ai_service.domain.ports import DisappointmentCandidateRepository
from ai_service.infrastructure.disappointment_detector import LLMDisappointmentDetector

logger = logging.getLogger(__name__)


class DisappointmentDetectionService:
    def __init__(
        self,
        repository: DisappointmentCandidateRepository,
        detector: LLMDisappointmentDetector,
        settings: Settings,
    ):
        self._repository = repository
        self._detector = detector
        self._settings = settings

    async def analyze_candidates(self) -> dict[str, int]:
        candidates = await self._repository.list_disappointment_candidates()
        existing = await self._repository.existing_disappointment_analyses(
            [candidate.listing_id for candidate in candidates]
        )
        pending = [
            candidate
            for candidate in candidates
            if not self._is_current(candidate, existing.get(candidate.listing_id))
        ]
        api_key = self._settings.review_summary_llm_api_key
        if not api_key or not api_key.get_secret_value():
            logger.warning("No LLM API key configured; disappointment analysis remains pending")
            return {
                "candidates": len(candidates),
                "analyzed": 0,
                "issues": 0,
                "skipped": len(candidates) - len(pending),
                "failures": len(pending),
            }

        analyzed = issues = failures = 0
        for candidate in pending:
            try:
                rating_assessment = self._assess_ratings(candidate.payload)
                model_result = await asyncio.to_thread(
                    self._detector.analyze, candidate, rating_assessment
                )
                result = model_result.result
                has_issue = (
                    rating_assessment["severity"] != "none" or result["semantic_discrepancy"]
                )
                severity = rating_assessment["severity"]
                if has_issue and severity == "none":
                    severity = "medium"
                evidence = rating_assessment["evidence"]
                if result["semantic_discrepancy"]:
                    evidence += result["evidence"]
                result["status"] = "issue" if has_issue else "no_issue"
                result["severity"] = severity
                result["recommendation_required"] = rating_assessment["recommendation_required"]
                result["summary"] = self._summary(rating_assessment, result["semantic_discrepancy"])
                result["evidence"] = [self._compact(item, 160) for item in dict.fromkeys(evidence)][
                    :3
                ]
                if (
                    rating_assessment["recommendation_required"]
                    and not result["service_recommendations"]
                ):
                    result["service_recommendations"] = [
                        self._fallback_recommendation(candidate.payload)
                    ]
                if not has_issue:
                    for field in ("description_recommendations", "tag_recommendations"):
                        result[field] = []
                    if not rating_assessment["recommendation_required"]:
                        result["service_recommendations"] = []
                for field in (
                    "service_recommendations",
                    "description_recommendations",
                    "tag_recommendations",
                ):
                    result[field] = [self._compact(item, 160) for item in result[field][:2]]
                await self._repository.save_disappointment_analysis(model_result)
                analyzed += 1
                issues += has_issue
            except Exception:
                failures += 1
                logger.exception(
                    "disappointment analysis failed listing_id=%s", candidate.listing_id
                )

        skipped = len(candidates) - len(pending)
        stats = {
            "candidates": len(candidates),
            "analyzed": analyzed,
            "issues": issues,
            "skipped": skipped,
            "failures": failures,
        }
        logger.info("disappointment analysis complete: %s", stats)
        return stats

    def _summary(self, assessment: dict, semantic_discrepancy: bool) -> str:
        overall = assessment.get("overall_rating")
        if assessment["severity"] != "none":
            if (
                isinstance(overall, (int, float))
                and overall <= self._settings.disappointment_low_overall_rating
            ):
                summary = (
                    f"Общий рейтинг {overall:g}/10 ниже порога "
                    f"{self._settings.disappointment_low_overall_rating:g}."
                )
            else:
                summary = "Низкая оценка отдельного показателя."
            if semantic_discrepancy:
                summary += " Также найдено расхождение с описанием или тегами."
            else:
                summary += " Прямого расхождения с описанием не найдено."
            return summary
        if semantic_discrepancy:
            return "В саммари найдено прямое противоречие описанию или тегам."
        if assessment["recommendation_required"] and isinstance(overall, (int, float)):
            return (
                f"Рейтинг {overall:g}/10 ниже порога рекомендации "
                f"{self._settings.disappointment_recommendation_overall_rating:g}; "
                "значимого негативного сигнала не выявлено."
            )
        return "Значимого негативного сигнала и прямого расхождения не выявлено."

    @staticmethod
    def _compact(value: str, max_chars: int) -> str:
        text = " ".join(value.split())
        if len(text) <= max_chars:
            return text
        sentence_end = max(
            text.rfind(".", 0, max_chars),
            text.rfind("!", 0, max_chars),
            text.rfind("?", 0, max_chars),
        )
        if sentence_end >= max_chars // 2:
            return text[: sentence_end + 1]
        return text[: max_chars - 1].rstrip() + "…"

    @staticmethod
    def _fallback_recommendation(payload: dict) -> str:
        reviews = payload.get("reviews")
        if isinstance(reviews, dict):
            details = reviews.get("average_rating_details")
            if isinstance(details, dict):
                scored_details = [
                    (name, value)
                    for name, value in details.items()
                    if isinstance(value, (int, float))
                ]
                if scored_details:
                    name, value = min(scored_details, key=lambda item: item[1])
                    return (
                        f"Изучите отзывы о показателе «{name}» со средней оценкой {value:g}/10 "
                        "и выберите конкретное улучшение для гостей."
                    )
        return (
            "Разберите повторяющиеся темы в саммари отзывов, выберите подтверждённую ими "
            "область улучшения и отслеживайте её оценки."
        )

    def _assess_ratings(self, payload: dict) -> dict:
        reviews = payload.get("reviews")
        if not isinstance(reviews, dict):
            reviews = {}
        count = reviews.get("overall_rating_count", 0)
        if not isinstance(count, int):
            count = 0
        overall = reviews.get("average_overall_rating")
        recommendation_required = (
            isinstance(overall, (int, float))
            and overall < self._settings.disappointment_recommendation_overall_rating
        )
        if count < self._settings.disappointment_min_rating_count:
            return {
                "severity": "none",
                "rating_count": count,
                "overall_rating": overall,
                "recommendation_required": recommendation_required,
                "evidence": [],
            }

        details = reviews.get("average_rating_details")
        if not isinstance(details, dict):
            details = {}
        evidence = []
        severity = "none"
        if isinstance(overall, (int, float)):
            if overall <= self._settings.disappointment_critical_overall_rating:
                severity = "high"
                evidence.append(
                    f"Средняя общая оценка {overall:g}/10 по {count} оценкам "
                    "ниже критического порога "
                    f"{self._settings.disappointment_critical_overall_rating:g}/10."
                )
            elif overall <= self._settings.disappointment_low_overall_rating:
                severity = "medium"
                evidence.append(
                    f"Средняя общая оценка {overall:g}/10 по {count} оценкам не выше порога "
                    f"{self._settings.disappointment_low_overall_rating:g}/10."
                )

            for name, value in details.items():
                if not isinstance(value, (int, float)):
                    continue
                if value <= self._settings.disappointment_low_dimension_rating:
                    severity = "high" if severity == "high" else "medium"
                    evidence.append(
                        f"Показатель {name}: {value:g}/10, не выше порога "
                        f"{self._settings.disappointment_low_dimension_rating:g}/10."
                    )
                elif overall - value >= self._settings.disappointment_dimension_gap:
                    severity = "high" if severity == "high" else "medium"
                    evidence.append(
                        f"Показатель {name}: {value:g}/10, на {overall - value:g} пункта ниже "
                        f"общей оценки {overall:g}/10."
                    )
        return {
            "severity": severity,
            "rating_count": count,
            "overall_rating": overall,
            "recommendation_required": recommendation_required,
            "average_rating_details": details,
            "evidence": evidence,
        }

    def _is_current(self, candidate: DisappointmentCandidate, existing) -> bool:
        return (
            existing is not None
            and existing.source_hash == candidate.content_hash
            and existing.model_id == self._detector.model_id
            and existing.prompt_version == self._detector.prompt_version
        )
