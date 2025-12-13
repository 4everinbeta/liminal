from functools import lru_cache
import os


class Settings:
    def __init__(self):
        self.secret_key = os.getenv("SECRET_KEY", "change-me-in-prod")
        self.algorithm = os.getenv("ALGORITHM", "HS256")
        self.access_token_expires_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRES_MINUTES", "60"))
        self.google_client_id = os.getenv("GOOGLE_CLIENT_ID", "")
        # LLM settings
        self.llm_base_url = os.getenv("LLM_BASE_URL", "http://localhost:11434/v1/chat/completions")
        # Default to the common DMR/Ollama tag; override via env to match your runtime.
        self.llm_model = os.getenv("LLM_MODEL", "ai/llama3.2:3B-Q4_0")
        self.llm_api_key = os.getenv("LLM_API_KEY", "")
        self.llm_provider = os.getenv("LLM_PROVIDER", "local")  # local | azure
        self.azure_openai_api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2023-09-01-preview")


@lru_cache()
def get_settings() -> Settings:
    return Settings()
