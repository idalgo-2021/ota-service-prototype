from functools import lru_cache
from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    log_level: str = "INFO"
    ai_db_host: str = "localhost"
    ai_db_port: int = 55432
    ai_db_name: str = "ai_service"
    ai_db_user: str = "ai_service"
    ai_db_password: SecretStr = SecretStr("change-me")
    ota_api_base_url: str = "http://localhost:8080"
    ota_ai_email: str = "ai-robot@example.invalid"
    ota_ai_password: SecretStr = SecretStr("change-me")
    ai_internal_api_key: SecretStr = SecretStr("change-me")
    assistant_llm_model_id: str = "openai/gpt-4o-mini"
    assistant_llm_api_base: str | None = None
    assistant_llm_api_key: SecretStr | None = None
    assistant_llm_temperature: float = 0.2
    assistant_agent_log_level: Literal["ERROR", "INFO", "DEBUG"] = "ERROR"
    assistant_timezone: str = "Asia/Bishkek"
    review_summary_llm_model_id: str = "openai/gpt-4o-mini"
    review_summary_llm_api_base: str | None = None
    review_summary_llm_api_key: SecretStr | None = None
    review_summary_llm_temperature: float = 0.2
    disappointment_min_rating_count: int = 5
    disappointment_low_overall_rating: float = 7.0
    disappointment_critical_overall_rating: float = 6.0
    disappointment_low_dimension_rating: float = 6.0
    disappointment_dimension_gap: float = 2.0
    disappointment_recommendation_overall_rating: float = 8.4
    chat_max_steps: int = 12
    chat_max_history_messages: int = 12
    review_summary_min_reviews: int = 1

    @property
    def database_url(self) -> str:
        return URL.create(
            "postgresql+asyncpg",
            username=self.ai_db_user,
            password=self.ai_db_password.get_secret_value(),
            host=self.ai_db_host,
            port=self.ai_db_port,
            database=self.ai_db_name,
        ).render_as_string(hide_password=False)


@lru_cache
def get_settings() -> Settings:
    return Settings()
