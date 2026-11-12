from collections.abc import Sequence
from typing import Any, Protocol

from ai_service.domain.models import (
    AssistantContext,
    AssistantReply,
    DisappointmentAnalysis,
    DisappointmentCandidate,
    PublishedReview,
    ReviewKind,
    ReviewSummary,
)


class OTAReviewGateway(Protocol):
    def listing_ids_within_center(self, location_name: str, max_distance_km: float) -> set[str]: ...

    def latest_listing_reviews(self, listing_id: str, limit: int) -> list[PublishedReview]: ...


class DisappointmentCandidateGateway(Protocol):
    def list_disappointment_candidates(self, limit: int, offset: int) -> dict[str, Any]: ...


class DisappointmentCandidateRepository(Protocol):
    async def replace_disappointment_candidates(
        self, candidates: list[DisappointmentCandidate]
    ) -> int: ...

    async def list_disappointment_candidates(self) -> list[DisappointmentCandidate]: ...

    async def existing_disappointment_analyses(
        self, listing_ids: list[str]
    ) -> dict[str, DisappointmentAnalysis]: ...

    async def save_disappointment_analysis(self, analysis: DisappointmentAnalysis) -> None: ...

    async def get_disappointment_analysis(
        self, listing_id: str
    ) -> DisappointmentAnalysis | None: ...

    async def list_disappointment_analyses(
        self, limit: int, offset: int
    ) -> tuple[list[DisappointmentAnalysis], int]: ...


class ReviewRepository(Protocol):
    async def upsert_reviews(self, reviews: list[PublishedReview]) -> set[str]: ...

    async def save_review_sample(
        self, target_reviews: dict[str, list[PublishedReview]]
    ) -> set[str]: ...

    async def complete_reconciliation(self, kind: ReviewKind, seen_ids: set[str]) -> set[str]: ...

    async def pending_targets(self, kind: ReviewKind) -> set[str]: ...

    async def targets_with_stale_summaries(
        self, kind: ReviewKind, prompt_version: str
    ) -> set[str]: ...

    async def mark_target_summarized(self, kind: ReviewKind, target_id: str) -> None: ...

    async def reviews_for_target(
        self, kind: ReviewKind, target_id: str
    ) -> list[dict[str, Any]]: ...

    async def save_summary(self, summary: ReviewSummary) -> None: ...

    async def delete_summary(self, kind: ReviewKind, target_id: str) -> None: ...

    async def get_summary(self, kind: ReviewKind, target_id: str) -> ReviewSummary | None: ...

    async def list_summaries(self, limit: int, offset: int) -> tuple[list[ReviewSummary], int]: ...


class ChatRepository(Protocol):
    async def history(
        self, session_id: str, owner_type: str, owner_id: str, limit: int
    ) -> Sequence[tuple[str, str]]: ...

    async def append_message(
        self, session_id: str, owner_type: str, owner_id: str, role: str, content: str
    ) -> None: ...

    async def trim_history(
        self, session_id: str, owner_type: str, owner_id: str, limit: int
    ) -> None: ...

    async def save_pending_action(
        self, session_id: str, owner_type: str, owner_id: str, action: dict[str, Any]
    ) -> None: ...

    async def get_pending_action(
        self, session_id: str, owner_type: str, owner_id: str
    ) -> dict[str, Any] | None: ...

    async def clear_pending_action(
        self, session_id: str, owner_type: str, owner_id: str
    ) -> None: ...


class AssistantPort(Protocol):
    async def respond(
        self, message: str, history: Sequence[tuple[str, str]], context: AssistantContext
    ) -> AssistantReply: ...


class ReviewSummarizer(Protocol):
    @property
    def prompt_version(self) -> str: ...

    def summarize(
        self, kind: ReviewKind, target_id: str, reviews: list[dict[str, Any]]
    ) -> ReviewSummary: ...
