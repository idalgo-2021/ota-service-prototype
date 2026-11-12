import hmac
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Literal

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import text

from ai_service.application.container import Container, build_container
from ai_service.config import Settings, get_settings
from ai_service.domain.models import (
    AssistantRecommendation,
    DisappointmentAnalysis,
    ReviewKind,
    ReviewSummary,
)

logger = logging.getLogger(__name__)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    session_id: str | None = None


class ChatResponse(BaseModel):
    session_id: str
    message: str
    recommendations: list[AssistantRecommendation] = Field(default_factory=list)
    quick_replies: list[str] = Field(default_factory=list)
    cart_updated: bool = False
    booking_created: bool = False
    booking_id: str | None = None


class SummaryResponse(BaseModel):
    entity_type: Literal["listing", "product"]
    entity_id: str
    summary: str
    source_review_count: int
    model_id: str
    prompt_version: str
    generated_at: datetime


class SummaryPageResponse(BaseModel):
    items: list[SummaryResponse]
    total: int
    limit: int
    offset: int


class DisappointmentAnalysisResponse(BaseModel):
    listing_id: str
    source_hash: str
    result: dict[str, object]
    model_id: str
    prompt_version: str
    generated_at: datetime


class DisappointmentAnalysisPageResponse(BaseModel):
    items: list[DisappointmentAnalysisResponse]
    total: int
    limit: int
    offset: int


def to_disappointment_analysis_response(
    analysis: DisappointmentAnalysis,
) -> DisappointmentAnalysisResponse:
    return DisappointmentAnalysisResponse(
        listing_id=analysis.listing_id,
        source_hash=analysis.source_hash,
        result=analysis.result,
        model_id=analysis.model_id,
        prompt_version=analysis.prompt_version,
        generated_at=analysis.generated_at,
    )


def get_container(request: Request) -> Container:
    return request.app.state.container


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.container = build_container(config)
        yield
        await app.state.container.engine.dispose()

    app = FastAPI(title="OTA AI Service", version="0.1.0", lifespan=lifespan)

    @app.get("/health", tags=["health"])
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/ready", tags=["health"])
    async def ready(container: Container = Depends(get_container)) -> dict[str, str]:
        try:
            async with container.sessions() as session:
                await session.execute(text("SELECT 1"))
        except Exception as exc:
            raise HTTPException(status_code=503, detail="database unavailable") from exc
        return {"status": "ready"}

    @app.post("/api/v1/chat", response_model=ChatResponse, tags=["assistant"])
    async def chat(
        payload: ChatRequest,
        x_internal_api_key: str | None = Header(default=None, alias="X-Internal-API-Key"),
        x_assistant_user_id: str | None = Header(default=None, alias="X-Assistant-User-ID"),
        authorization: str | None = Header(default=None),
        container: Container = Depends(get_container),
    ) -> ChatResponse:
        expected = config.ai_internal_api_key.get_secret_value()
        if not x_internal_api_key or not hmac.compare_digest(x_internal_api_key, expected):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid internal API key"
            )
        if bool(x_assistant_user_id) != bool(authorization):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="incomplete user context"
            )
        try:
            session_id, reply = await container.chat.reply(
                payload.message,
                payload.session_id,
                user_id=x_assistant_user_id,
                access_token=(
                    authorization.partition(" ")[2].strip()
                    if authorization and authorization.partition(" ")[0].lower() == "bearer"
                    else None
                ),
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except Exception as exc:
            logger.exception("Assistant request failed")
            raise HTTPException(
                status_code=503, detail="assistant is temporarily unavailable"
            ) from exc
        return ChatResponse(
            session_id=session_id,
            message=reply.message,
            recommendations=list(reply.recommendations),
            quick_replies=list(reply.quick_replies),
            cart_updated=reply.cart_updated,
            booking_created=reply.booking_created,
            booking_id=reply.booking_id,
        )

    @app.get(
        "/internal/v1/review-summaries",
        response_model=SummaryPageResponse,
        tags=["internal"],
    )
    async def list_summaries(
        limit: int = Query(default=100, ge=1, le=500),
        offset: int = Query(default=0, ge=0),
        x_internal_api_key: str | None = Header(default=None, alias="X-Internal-API-Key"),
        container: Container = Depends(get_container),
    ) -> SummaryPageResponse:
        expected = config.ai_internal_api_key.get_secret_value()
        if not x_internal_api_key or not hmac.compare_digest(x_internal_api_key, expected):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid internal API key"
            )
        summaries, total = await container.repository.list_summaries(limit, offset)
        return SummaryPageResponse(
            items=[
                SummaryResponse(
                    entity_type=summary.kind,
                    entity_id=summary.target_id,
                    summary=summary.text,
                    source_review_count=summary.source_review_count,
                    model_id=summary.model_id,
                    prompt_version=summary.prompt_version,
                    generated_at=summary.generated_at,
                )
                for summary in summaries
            ],
            total=total,
            limit=limit,
            offset=offset,
        )

    @app.get(
        "/internal/v1/review-summaries/{entity_type}/{entity_id}",
        response_model=SummaryResponse,
        tags=["internal"],
    )
    async def get_summary(
        entity_type: ReviewKind,
        entity_id: str,
        x_internal_api_key: str | None = Header(default=None, alias="X-Internal-API-Key"),
        container: Container = Depends(get_container),
    ) -> SummaryResponse:
        expected = config.ai_internal_api_key.get_secret_value()
        if not x_internal_api_key or not hmac.compare_digest(x_internal_api_key, expected):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid internal API key"
            )
        summary: ReviewSummary | None = await container.repository.get_summary(
            entity_type, entity_id
        )
        if summary is None:
            raise HTTPException(status_code=404, detail="review summary not found")
        return SummaryResponse(
            entity_type=summary.kind,
            entity_id=summary.target_id,
            summary=summary.text,
            source_review_count=summary.source_review_count,
            model_id=summary.model_id,
            prompt_version=summary.prompt_version,
            generated_at=summary.generated_at,
        )

    @app.get(
        "/internal/v1/disappointment-analyses",
        response_model=DisappointmentAnalysisPageResponse,
        tags=["internal"],
    )
    async def list_disappointment_analyses(
        limit: int = Query(default=100, ge=1, le=500),
        offset: int = Query(default=0, ge=0),
        x_internal_api_key: str | None = Header(default=None, alias="X-Internal-API-Key"),
        container: Container = Depends(get_container),
    ) -> DisappointmentAnalysisPageResponse:
        expected = config.ai_internal_api_key.get_secret_value()
        if not x_internal_api_key or not hmac.compare_digest(x_internal_api_key, expected):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid internal API key"
            )
        analyses, total = await container.repository.list_disappointment_analyses(limit, offset)
        return DisappointmentAnalysisPageResponse(
            items=[to_disappointment_analysis_response(item) for item in analyses],
            total=total,
            limit=limit,
            offset=offset,
        )

    @app.get(
        "/internal/v1/disappointment-analyses/{listing_id}",
        response_model=DisappointmentAnalysisResponse,
        tags=["internal"],
    )
    async def get_disappointment_analysis(
        listing_id: str,
        x_internal_api_key: str | None = Header(default=None, alias="X-Internal-API-Key"),
        container: Container = Depends(get_container),
    ) -> DisappointmentAnalysisResponse:
        expected = config.ai_internal_api_key.get_secret_value()
        if not x_internal_api_key or not hmac.compare_digest(x_internal_api_key, expected):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid internal API key"
            )
        analysis = await container.repository.get_disappointment_analysis(listing_id)
        if analysis is None:
            raise HTTPException(status_code=404, detail="disappointment analysis not found")
        return to_disappointment_analysis_response(analysis)

    return app
