import json
from datetime import UTC, datetime, timedelta

from sqlalchemy import (
    JSON,
    DateTime,
    Integer,
    String,
    Text,
    all_,
    and_,
    bindparam,
    case,
    delete,
    exists,
    func,
    select,
    update,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from ai_service.domain.models import (
    DisappointmentAnalysis,
    DisappointmentCandidate,
    PublishedReview,
    ReviewKind,
    ReviewSummary,
)
from ai_service.domain.ports import (
    ChatRepository,
    DisappointmentCandidateRepository,
    ReviewRepository,
)


class Base(DeclarativeBase):
    pass


class ReviewRecord(Base):
    __tablename__ = "review_records"

    kind: Mapped[str] = mapped_column(String(16), primary_key=True)
    review_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    target_id: Mapped[str] = mapped_column(String(64), index=True)
    content_hash: Mapped[str] = mapped_column(String(64))
    content: Mapped[dict] = mapped_column(JSON)
    source_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    active: Mapped[bool] = mapped_column(default=True, index=True)
    pending_summary: Mapped[bool] = mapped_column(default=True, index=True)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class SummaryRecord(Base):
    __tablename__ = "review_summaries"

    kind: Mapped[str] = mapped_column(String(16), primary_key=True)
    target_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    text: Mapped[str] = mapped_column(Text)
    source_review_count: Mapped[int] = mapped_column(Integer)
    model_id: Mapped[str] = mapped_column(String(255))
    prompt_version: Mapped[str] = mapped_column(String(64))
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ReviewSampleRecord(Base):
    __tablename__ = "review_samples"

    kind: Mapped[str] = mapped_column(String(16), primary_key=True)
    target_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    review_ids: Mapped[list[str]] = mapped_column(JSON)
    sample_hash: Mapped[str] = mapped_column(String(64))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class DisappointmentCandidateRecord(Base):
    __tablename__ = "disappointment_candidates"

    listing_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    payload: Mapped[dict] = mapped_column(JSON)
    content_hash: Mapped[str] = mapped_column(String(64))
    imported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class DisappointmentAnalysisRecord(Base):
    __tablename__ = "disappointment_analyses"

    listing_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    source_hash: Mapped[str] = mapped_column(String(64))
    result: Mapped[dict] = mapped_column(JSON)
    model_id: Mapped[str] = mapped_column(String(255))
    prompt_version: Mapped[str] = mapped_column(String(64))
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ChatMessageRecord(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(64), index=True)
    owner_type: Mapped[str] = mapped_column(String(16), index=True)
    owner_id: Mapped[str] = mapped_column(String(64), index=True)
    role: Mapped[str] = mapped_column(String(16))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )


class PendingActionRecord(Base):
    __tablename__ = "chat_pending_actions"

    session_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    owner_type: Mapped[str] = mapped_column(String(16), primary_key=True)
    owner_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    action: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class PostgresRepository(ReviewRepository, ChatRepository, DisappointmentCandidateRepository):
    def __init__(self, sessions: async_sessionmaker[AsyncSession]):
        self._sessions = sessions

    async def upsert_reviews(self, reviews: list[PublishedReview]) -> set[str]:
        changed_targets: set[str] = set()
        if not reviews:
            return changed_targets
        kind = reviews[0].kind
        review_ids = [review.review_id for review in reviews]
        async with self._sessions() as session:
            existing = (
                await session.scalars(
                    select(ReviewRecord).where(
                        ReviewRecord.kind == kind, ReviewRecord.review_id.in_(review_ids)
                    )
                )
            ).all()
            existing_by_id = {row.review_id: row for row in existing}
            now = datetime.now(UTC)
            values = []
            for review in reviews:
                row = existing_by_id.get(review.review_id)
                changed = (
                    row is None
                    or row.content_hash != review.content_hash
                    or not row.active
                    or row.target_id != review.target_id
                )
                if changed:
                    changed_targets.add(review.target_id)
                    if row is not None:
                        changed_targets.add(row.target_id)
                values.append(
                    {
                        "kind": review.kind,
                        "review_id": review.review_id,
                        "target_id": review.target_id,
                        "content_hash": review.content_hash,
                        "content": review.content,
                        "source_updated_at": review.updated_at,
                        "active": True,
                        "pending_summary": bool(changed),
                        "observed_at": now,
                    }
                )
            insert = pg_insert(ReviewRecord).values(values)
            excluded = insert.excluded
            statement = insert.on_conflict_do_update(
                index_elements=[ReviewRecord.kind, ReviewRecord.review_id],
                set_={
                    "target_id": excluded.target_id,
                    "content_hash": excluded.content_hash,
                    "content": excluded.content,
                    "source_updated_at": excluded.source_updated_at,
                    "active": True,
                    "pending_summary": case(
                        (ReviewRecord.content_hash != excluded.content_hash, True),
                        (ReviewRecord.active.is_(False), True),
                        (ReviewRecord.target_id != excluded.target_id, True),
                        else_=ReviewRecord.pending_summary,
                    ),
                    "observed_at": func.now(),
                },
            )
            await session.execute(statement)
            await session.commit()
            return changed_targets

    async def replace_disappointment_candidates(
        self, candidates: list[DisappointmentCandidate]
    ) -> int:
        now = datetime.now(UTC)
        candidate_ids = {candidate.listing_id for candidate in candidates}
        async with self._sessions() as session:
            async with session.begin():
                existing_rows = (
                    await session.execute(
                        select(
                            DisappointmentCandidateRecord.listing_id,
                            DisappointmentCandidateRecord.content_hash,
                        )
                    )
                ).all()
                existing = {listing_id: content_hash for listing_id, content_hash in existing_rows}
                changed = sum(
                    1
                    for candidate in candidates
                    if existing.get(candidate.listing_id) != candidate.content_hash
                ) + len(existing.keys() - candidate_ids)

                await session.execute(delete(DisappointmentCandidateRecord))
                if candidates:
                    session.add_all(
                        [
                            DisappointmentCandidateRecord(
                                listing_id=candidate.listing_id,
                                payload=candidate.payload,
                                content_hash=candidate.content_hash,
                                imported_at=now,
                            )
                            for candidate in candidates
                        ]
                    )
        return changed

    async def list_disappointment_candidates(self) -> list[DisappointmentCandidate]:
        async with self._sessions() as session:
            rows = (
                await session.scalars(
                    select(DisappointmentCandidateRecord).order_by(
                        DisappointmentCandidateRecord.listing_id
                    )
                )
            ).all()
            return [
                DisappointmentCandidate(
                    listing_id=row.listing_id,
                    payload=row.payload,
                    content_hash=row.content_hash,
                )
                for row in rows
            ]

    async def existing_disappointment_analyses(
        self, listing_ids: list[str]
    ) -> dict[str, DisappointmentAnalysis]:
        if not listing_ids:
            return {}
        async with self._sessions() as session:
            rows = (
                await session.scalars(
                    select(DisappointmentAnalysisRecord).where(
                        DisappointmentAnalysisRecord.listing_id.in_(listing_ids)
                    )
                )
            ).all()
            return {
                row.listing_id: DisappointmentAnalysis(
                    listing_id=row.listing_id,
                    source_hash=row.source_hash,
                    result=row.result,
                    model_id=row.model_id,
                    prompt_version=row.prompt_version,
                    generated_at=row.generated_at,
                )
                for row in rows
            }

    @staticmethod
    def _current_disappointment_analysis_query():
        return select(DisappointmentAnalysisRecord).join(
            DisappointmentCandidateRecord,
            and_(
                DisappointmentCandidateRecord.listing_id == DisappointmentAnalysisRecord.listing_id,
                DisappointmentCandidateRecord.content_hash
                == DisappointmentAnalysisRecord.source_hash,
            ),
        )

    @staticmethod
    def _to_disappointment_analysis(row: DisappointmentAnalysisRecord) -> DisappointmentAnalysis:
        return DisappointmentAnalysis(
            listing_id=row.listing_id,
            source_hash=row.source_hash,
            result=row.result,
            model_id=row.model_id,
            prompt_version=row.prompt_version,
            generated_at=row.generated_at,
        )

    async def get_disappointment_analysis(self, listing_id: str) -> DisappointmentAnalysis | None:
        query = self._current_disappointment_analysis_query()
        async with self._sessions() as session:
            row = await session.scalar(
                query.where(DisappointmentAnalysisRecord.listing_id == listing_id)
            )
            return self._to_disappointment_analysis(row) if row is not None else None

    async def list_disappointment_analyses(
        self, limit: int, offset: int
    ) -> tuple[list[DisappointmentAnalysis], int]:
        query = self._current_disappointment_analysis_query()
        async with self._sessions() as session:
            total = await session.scalar(select(func.count()).select_from(query.subquery()))
            rows = (
                await session.scalars(
                    query.order_by(DisappointmentAnalysisRecord.listing_id)
                    .limit(limit)
                    .offset(offset)
                )
            ).all()
            return [self._to_disappointment_analysis(row) for row in rows], int(total or 0)

    async def save_disappointment_analysis(self, analysis: DisappointmentAnalysis) -> None:
        async with self._sessions() as session:
            row = await session.get(DisappointmentAnalysisRecord, analysis.listing_id)
            if row is None:
                row = DisappointmentAnalysisRecord(listing_id=analysis.listing_id)
                session.add(row)
            row.source_hash = analysis.source_hash
            row.result = analysis.result
            row.model_id = analysis.model_id
            row.prompt_version = analysis.prompt_version
            row.generated_at = analysis.generated_at
            await session.commit()

    async def complete_reconciliation(self, kind: ReviewKind, seen_ids: set[str]) -> set[str]:
        async with self._sessions() as session:
            stmt = (
                update(ReviewRecord)
                .where(
                    ReviewRecord.kind == kind,
                    ReviewRecord.active.is_(True),
                    ReviewRecord.review_id != all_(bindparam("seen_ids", type_=ARRAY(String))),
                )
                .values(active=False, pending_summary=True)
                .returning(ReviewRecord.target_id)
            )
            changed_targets = set(
                (await session.scalars(stmt, {"seen_ids": sorted(seen_ids)})).all()
            )
            await session.commit()
        return changed_targets

    async def save_review_sample(
        self, target_reviews: dict[str, list[PublishedReview]]
    ) -> set[str]:
        import hashlib
        import json

        changed_targets: set[str] = set()
        now = datetime.now(UTC)
        async with self._sessions() as session:
            for target_id, reviews in target_reviews.items():
                review_ids = [review.review_id for review in reviews]
                sample_hash = hashlib.sha256(
                    json.dumps(review_ids, separators=(",", ":")).encode()
                ).hexdigest()
                row = await session.get(ReviewSampleRecord, ("listing", target_id))
                if row is None:
                    row = ReviewSampleRecord(
                        kind="listing",
                        target_id=target_id,
                        review_ids=review_ids,
                        sample_hash=sample_hash,
                        updated_at=now,
                    )
                    session.add(row)
                    changed_targets.add(target_id)
                elif row.sample_hash != sample_hash:
                    row.review_ids = review_ids
                    row.sample_hash = sample_hash
                    row.updated_at = now
                    changed_targets.add(target_id)
            if changed_targets:
                await session.execute(
                    update(ReviewRecord)
                    .where(
                        ReviewRecord.kind == "listing",
                        ReviewRecord.target_id.in_(sorted(changed_targets)),
                        ReviewRecord.active.is_(True),
                    )
                    .values(pending_summary=True)
                )
            await session.commit()
        return changed_targets

    async def pending_targets(self, kind: ReviewKind) -> set[str]:
        async with self._sessions() as session:
            rows = (
                await session.scalars(
                    select(ReviewRecord.target_id)
                    .where(ReviewRecord.kind == kind, ReviewRecord.pending_summary.is_(True))
                    .distinct()
                )
            ).all()
            return set(rows)

    async def targets_with_stale_summaries(self, kind: ReviewKind, prompt_version: str) -> set[str]:
        async with self._sessions() as session:
            rows = (
                await session.scalars(
                    select(ReviewRecord.target_id)
                    .outerjoin(
                        SummaryRecord,
                        and_(
                            SummaryRecord.kind == ReviewRecord.kind,
                            SummaryRecord.target_id == ReviewRecord.target_id,
                        ),
                    )
                    .where(
                        ReviewRecord.kind == kind,
                        ReviewRecord.active.is_(True),
                        SummaryRecord.target_id.is_not(None),
                        SummaryRecord.prompt_version != prompt_version,
                    )
                    .distinct()
                )
            ).all()
            return set(rows)

    async def mark_target_summarized(self, kind: ReviewKind, target_id: str) -> None:
        async with self._sessions() as session:
            rows = (
                await session.scalars(
                    select(ReviewRecord).where(
                        ReviewRecord.kind == kind, ReviewRecord.target_id == target_id
                    )
                )
            ).all()
            for row in rows:
                row.pending_summary = False
            await session.commit()

    async def reviews_for_target(self, kind: ReviewKind, target_id: str) -> list[dict]:
        async with self._sessions() as session:
            sample = await session.get(ReviewSampleRecord, (kind, target_id))
            if sample is None or not sample.review_ids:
                return []
            rows = (
                await session.scalars(
                    select(ReviewRecord)
                    .where(
                        ReviewRecord.kind == kind,
                        ReviewRecord.target_id == target_id,
                        ReviewRecord.review_id.in_(sample.review_ids),
                        ReviewRecord.active.is_(True),
                    )
                    .order_by(ReviewRecord.source_updated_at, ReviewRecord.review_id)
                )
            ).all()
            return [row.content for row in rows]

    async def save_summary(self, summary: ReviewSummary) -> None:
        async with self._sessions() as session:
            row = await session.get(SummaryRecord, (summary.kind, summary.target_id))
            if row is None:
                row = SummaryRecord(
                    kind=summary.kind,
                    target_id=summary.target_id,
                    text=summary.text,
                    source_review_count=summary.source_review_count,
                    model_id=summary.model_id,
                    prompt_version=summary.prompt_version,
                    generated_at=summary.generated_at,
                )
                session.add(row)
            else:
                row.text = summary.text
                row.source_review_count = summary.source_review_count
                row.model_id = summary.model_id
                row.prompt_version = summary.prompt_version
                row.generated_at = summary.generated_at
            await session.commit()

    async def delete_summary(self, kind: ReviewKind, target_id: str) -> None:
        async with self._sessions() as session:
            row = await session.get(SummaryRecord, (kind, target_id))
            if row is not None:
                await session.delete(row)
                await session.commit()

    async def get_summary(self, kind: ReviewKind, target_id: str) -> ReviewSummary | None:
        async with self._sessions() as session:
            row = await session.get(SummaryRecord, (kind, target_id))
            if row is None:
                return None
            pending = await session.scalar(
                select(ReviewRecord.review_id)
                .where(
                    ReviewRecord.kind == kind,
                    ReviewRecord.target_id == target_id,
                    ReviewRecord.pending_summary.is_(True),
                )
                .limit(1)
            )
            if pending is not None:
                return None
            return ReviewSummary(
                kind=row.kind,
                target_id=row.target_id,
                text=row.text,
                source_review_count=row.source_review_count,
                model_id=row.model_id,
                prompt_version=row.prompt_version,
                generated_at=row.generated_at,
            )

    async def list_summaries(self, limit: int, offset: int) -> tuple[list[ReviewSummary], int]:
        pending_review_exists = exists(
            select(ReviewRecord.review_id).where(
                ReviewRecord.kind == SummaryRecord.kind,
                ReviewRecord.target_id == SummaryRecord.target_id,
                ReviewRecord.pending_summary.is_(True),
            )
        )
        async with self._sessions() as session:
            filters = ~pending_review_exists
            total = await session.scalar(
                select(func.count()).select_from(SummaryRecord).where(filters)
            )
            rows = (
                await session.scalars(
                    select(SummaryRecord)
                    .where(filters)
                    .order_by(SummaryRecord.kind, SummaryRecord.target_id)
                    .limit(limit)
                    .offset(offset)
                )
            ).all()
            summaries = [
                ReviewSummary(
                    kind=row.kind,
                    target_id=row.target_id,
                    text=row.text,
                    source_review_count=row.source_review_count,
                    model_id=row.model_id,
                    prompt_version=row.prompt_version,
                    generated_at=row.generated_at,
                )
                for row in rows
            ]
            return summaries, int(total or 0)

    async def history(
        self, session_id: str, owner_type: str, owner_id: str, limit: int
    ) -> list[tuple[str, str]]:
        async with self._sessions() as session:
            rows = (
                await session.scalars(
                    select(ChatMessageRecord)
                    .where(
                        ChatMessageRecord.session_id == session_id,
                        ChatMessageRecord.owner_type == owner_type,
                        ChatMessageRecord.owner_id == owner_id,
                    )
                    .order_by(ChatMessageRecord.id.desc())
                    .limit(limit)
                )
            ).all()
            return [(row.role, row.content) for row in reversed(rows)]

    async def append_message(
        self, session_id: str, owner_type: str, owner_id: str, role: str, content: str
    ) -> None:
        async with self._sessions() as session:
            session.add(
                ChatMessageRecord(
                    session_id=session_id,
                    owner_type=owner_type,
                    owner_id=owner_id,
                    role=role,
                    content=content,
                )
            )
            await session.commit()

    async def trim_history(
        self, session_id: str, owner_type: str, owner_id: str, limit: int
    ) -> None:
        async with self._sessions() as session:
            keep_ids = (
                select(ChatMessageRecord.id)
                .where(
                    ChatMessageRecord.session_id == session_id,
                    ChatMessageRecord.owner_type == owner_type,
                    ChatMessageRecord.owner_id == owner_id,
                )
                .order_by(ChatMessageRecord.id.desc())
                .limit(limit)
            )
            await session.execute(
                delete(ChatMessageRecord).where(
                    ChatMessageRecord.session_id == session_id,
                    ChatMessageRecord.owner_type == owner_type,
                    ChatMessageRecord.owner_id == owner_id,
                    ChatMessageRecord.id.not_in(keep_ids),
                )
            )
            await session.commit()

    async def save_pending_action(
        self, session_id: str, owner_type: str, owner_id: str, action: dict
    ) -> None:
        async with self._sessions() as session:
            now = datetime.now(UTC)
            await session.execute(
                delete(PendingActionRecord).where(
                    PendingActionRecord.created_at < now - timedelta(minutes=30)
                )
            )
            await session.execute(
                delete(PendingActionRecord).where(
                    PendingActionRecord.session_id == session_id,
                    PendingActionRecord.owner_type == owner_type,
                    PendingActionRecord.owner_id == owner_id,
                )
            )
            session.add(
                PendingActionRecord(
                    session_id=session_id,
                    owner_type=owner_type,
                    owner_id=owner_id,
                    action=action,
                    created_at=now,
                )
            )
            await session.commit()

    async def get_pending_action(
        self, session_id: str, owner_type: str, owner_id: str
    ) -> dict | None:
        async with self._sessions() as session:
            row = await session.get(PendingActionRecord, (session_id, owner_type, owner_id))
            if row is None:
                return None
            if (datetime.now(UTC) - row.created_at).total_seconds() > 1800:
                await session.delete(row)
                await session.commit()
                return None
            return row.action

    async def take_pending_action(
        self, session_id: str, owner_type: str, owner_id: str
    ) -> dict | None:
        async with self._sessions() as session:
            result = await session.execute(
                delete(PendingActionRecord)
                .where(
                    PendingActionRecord.session_id == session_id,
                    PendingActionRecord.owner_type == owner_type,
                    PendingActionRecord.owner_id == owner_id,
                    PendingActionRecord.created_at >= datetime.now(UTC) - timedelta(minutes=30),
                )
                .returning(PendingActionRecord.action)
            )
            await session.commit()
            return result.scalar_one_or_none()

    async def clear_pending_action(self, session_id: str, owner_type: str, owner_id: str) -> None:
        async with self._sessions() as session:
            await session.execute(
                delete(PendingActionRecord).where(
                    PendingActionRecord.session_id == session_id,
                    PendingActionRecord.owner_type == owner_type,
                    PendingActionRecord.owner_id == owner_id,
                )
            )
            await session.commit()


def create_database(database_url: str):
    engine = create_async_engine(
        database_url,
        pool_pre_ping=True,
        json_serializer=lambda value: json.dumps(value, ensure_ascii=False),
    )
    return engine, async_sessionmaker(engine, expire_on_commit=False)
