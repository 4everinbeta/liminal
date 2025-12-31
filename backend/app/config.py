from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Local/dev auth
    enable_local_auth: bool = False
    
    # Local JWT settings
    secret_key: str = "change-me-in-prod"
    algorithm: str = "HS256"
    access_token_expires_minutes: int = 60

    # OIDC settings
    oidc_issuer: Optional[str] = None
    oidc_audience: Optional[str] = None
    oidc_jwks_url: Optional[str] = None
    oidc_email_claim: str = "email"
    oidc_name_claim: str = "name"

    # Legacy Google token-login
    google_client_id: Optional[str] = None

    # LLM settings
    llm_base_url: str = "http://localhost:11434/v1/chat/completions"
    llm_model: str = "ai/llama3.2:3B-Q4_0"
    llm_api_key: Optional[str] = None
    llm_provider: str = "local"
    azure_openai_api_version: str = "2023-09-01-preview"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8", 
        case_sensitive=False,
        extra="ignore"
    )

@lru_cache()
def get_settings() -> Settings:
    return Settings()