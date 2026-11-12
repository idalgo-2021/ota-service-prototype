from dataclasses import dataclass
from datetime import datetime
from typing import Any, Literal

ReviewKind = Literal["listing", "product"]


@dataclass(frozen=True)
class AssistantContext:
    user_id: str | None = None
    access_token: str | None = None


@dataclass(frozen=True)
class AssistantRecommendation:
    kind: Literal["listing", "product"]
    id: str
    title: str
    image_url: str | None = None
    subtitle: str | None = None
    price_label: str | None = None
    rating_label: str | None = None


@dataclass(frozen=True)
class AssistantReply:
    message: str
    recommendations: tuple[AssistantRecommendation, ...] = ()
    pending_action: dict[str, Any] | None = None
    quick_replies: tuple[str, ...] = ()
    cart_updated: bool = False
    booking_created: bool = False
    booking_id: str | None = None


@dataclass(frozen=True)
class PublishedReview:
    kind: ReviewKind
    review_id: str
    target_id: str
    updated_at: datetime
    content: dict[str, Any]

    @property
    def content_hash(self) -> str:
        import hashlib
        import json

        encoded = json.dumps(
            self.content, sort_keys=True, ensure_ascii=False, separators=(",", ":")
        )
        return hashlib.sha256(encoded.encode()).hexdigest()


@dataclass(frozen=True)
class ReviewSummary:
    kind: ReviewKind
    target_id: str
    text: str
    source_review_count: int
    model_id: str
    prompt_version: str
    generated_at: datetime


@dataclass(frozen=True)
class DisappointmentCandidate:
    listing_id: str
    payload: dict[str, Any]
    content_hash: str


@dataclass(frozen=True)
class DisappointmentAnalysis:
    listing_id: str
    source_hash: str
    result: dict[str, Any]
    model_id: str
    prompt_version: str
    generated_at: datetime
