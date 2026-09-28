from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./recallops.db"
    recallops_demo_mode: bool = True
    frontend_origins: str = "http://localhost:8443,http://localhost:3000"

    hindsight_mode: str = "local"
    hindsight_base_url: str = "http://localhost:8888"
    hindsight_api_key: str = ""
    hindsight_bank_id: str = "recallops-incidents"
    hindsight_allow_db_fallback: bool = True

    groq_api_key: str = ""
    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_model: str = "llama-3.3-70b-versatile"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
