import asyncio
import logging

from ai_service.config import Settings
from ai_service.domain.models import ReviewSummary
from ai_service.domain.ports import OTAReviewGateway, ReviewRepository, ReviewSummarizer

logger = logging.getLogger(__name__)
SUMMARY_LOCATION_NAME = "Санкт-Петербург"
SUMMARY_MAX_DISTANCE_KM = 0.5


class ReviewSyncService:
    def __init__(
        self,
        gateway: OTAReviewGateway,
        repository: ReviewRepository,
        summarizer: ReviewSummarizer,
        settings: Settings,
    ):
        self._gateway = gateway
        self._repository = repository
        self._summarizer = summarizer
        self._settings = settings

    async def import_recent_listing_reviews(self) -> dict[str, int]:
        target_scope = await asyncio.to_thread(
            self._gateway.listing_ids_within_center,
            SUMMARY_LOCATION_NAME,
            SUMMARY_MAX_DISTANCE_KM,
        )
        if not target_scope:
            raise RuntimeError("OTA returned no listings for the configured review import scope")

        target_reviews = {}
        for target_id in sorted(target_scope):
            target_reviews[target_id] = await asyncio.to_thread(
                self._gateway.latest_listing_reviews, target_id, 50
            )

        incoming = [review for reviews in target_reviews.values() for review in reviews]
        changed_targets = await self._repository.upsert_reviews(incoming)
        changed_targets.update(await self._repository.save_review_sample(target_reviews))
        for target_id, reviews in target_reviews.items():
            if not reviews:
                await self._repository.delete_summary("listing", target_id)
        review_count = sum(len(reviews) for reviews in target_reviews.values())
        logger.info(
            "review import complete location=%s max_distance_km=%s "
            "listings=%d reviews=%d changed=%d",
            SUMMARY_LOCATION_NAME,
            SUMMARY_MAX_DISTANCE_KM,
            len(target_scope),
            review_count,
            len(changed_targets),
        )
        return {
            "listings": len(target_scope),
            "reviews": review_count,
            "changed_targets": len(changed_targets),
        }

    async def summarize_pending_listings(self) -> dict[str, int]:
        kind = "listing"
        target_scope = await asyncio.to_thread(
            self._gateway.listing_ids_within_center,
            SUMMARY_LOCATION_NAME,
            SUMMARY_MAX_DISTANCE_KM,
        )
        changed_targets = await self._repository.pending_targets(kind)
        changed_targets.update(
            await self._repository.targets_with_stale_summaries(
                kind, self._summarizer.prompt_version
            )
        )
        changed_targets.intersection_update(target_scope)
        summaries_created = 0
        summary_failures = 0
        if (
            self._settings.review_summary_llm_api_key is None
            or not self._settings.review_summary_llm_api_key.get_secret_value()
        ):
            logger.warning(
                "REVIEW_SUMMARY_LLM_API_KEY is not configured; "
                "review summaries remain pending for kind=%s",
                kind,
            )
            return {
                "targets": len(changed_targets),
                "summaries": summaries_created,
                "summary_failures": len(changed_targets),
            }
        for target_id in sorted(changed_targets):
            try:
                reviews = await self._repository.reviews_for_target(kind, target_id)
                if len(reviews) < self._settings.review_summary_min_reviews:
                    await self._repository.delete_summary(kind, target_id)
                    await self._repository.mark_target_summarized(kind, target_id)
                    continue
                summary: ReviewSummary = await asyncio.to_thread(
                    self._summarizer.summarize, kind, target_id, reviews
                )
                await self._repository.save_summary(summary)
                await self._repository.mark_target_summarized(kind, target_id)
                summaries_created += 1
            except Exception:
                # Keep the target pending so a later manual run can retry it.
                summary_failures += 1
                logger.exception("review summary failed kind=%s target_id=%s", kind, target_id)
        logger.info(
            "review summarization complete kind=%s targets=%d summaries=%d failures=%d",
            kind,
            len(changed_targets),
            summaries_created,
            summary_failures,
        )
        return {
            "targets": len(changed_targets),
            "summaries": summaries_created,
            "summary_failures": summary_failures,
        }

    async def run_once(self) -> dict[str, dict[str, int]]:
        imported = await self.import_recent_listing_reviews()
        summarized = await self.summarize_pending_listings()
        return {"import": imported, "summarize": summarized}
