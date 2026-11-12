from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from ai_service.application.chat import ChatService
from ai_service.application.disappointment import DisappointmentCandidateImporter
from ai_service.application.disappointment_detection import DisappointmentDetectionService
from ai_service.application.reviews import ReviewSyncService
from ai_service.config import Settings
from ai_service.infrastructure.assistant import SmolagentsAssistant
from ai_service.infrastructure.disappointment_detector import LLMDisappointmentDetector
from ai_service.infrastructure.ota import OTAClient
from ai_service.infrastructure.persistence import PostgresRepository, create_database
from ai_service.infrastructure.summarizer import LLMReviewSummarizer
from ai_service.infrastructure.web_search import WeatherWebSearch


def _execute_pending_action(settings: Settings, action: dict, access_token: str) -> dict:
    ota = OTAClient(settings.ota_api_base_url, access_token=access_token)
    if action.get("type") == "booking":
        return ota.create_booking(action)
    if action.get("type") == "product":
        return ota.add_product_to_pending_order(action["product"])
    raise ValueError("unsupported pending assistant action")


@dataclass
class Container:
    engine: AsyncEngine
    sessions: async_sessionmaker[AsyncSession]
    repository: PostgresRepository
    ota: OTAClient
    chat: ChatService
    reviews: ReviewSyncService
    disappointment_candidates: DisappointmentCandidateImporter
    disappointment_detection: DisappointmentDetectionService


def build_container(settings: Settings) -> Container:
    engine, sessions = create_database(settings.database_url)
    repository = PostgresRepository(sessions)
    ota = OTAClient(
        settings.ota_api_base_url,
        settings.ota_ai_email,
        settings.ota_ai_password.get_secret_value(),
    )
    assistant = SmolagentsAssistant(settings, WeatherWebSearch())
    summarizer = LLMReviewSummarizer(settings)
    disappointment_detector = LLMDisappointmentDetector(settings)
    return Container(
        engine=engine,
        sessions=sessions,
        repository=repository,
        ota=ota,
        chat=ChatService(
            repository,
            assistant,
            settings.chat_max_history_messages,
            lambda action, token: _execute_pending_action(settings, action, token),
        ),
        reviews=ReviewSyncService(ota, repository, summarizer, settings),
        disappointment_candidates=DisappointmentCandidateImporter(ota, repository),
        disappointment_detection=DisappointmentDetectionService(
            repository, disappointment_detector, settings
        ),
    )
