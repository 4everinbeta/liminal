from functools import lru_cache
import os


class Settings:
    def __init__(self):
        # Local/dev auth (tests use this). In prod, leave disabled and use OIDC.
        self.enable_local_auth = os.getenv("ENABLE_LOCAL_AUTH", "").lower() in ("1", "true", "yes")

        # Local JWT settings (only used when enable_local_auth is true)
        self.secret_key = os.getenv("SECRET_KEY", "change-me-in-prod")
        self.algorithm = os.getenv("ALGORITHM", "HS256")
        self.access_token_expires_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRES_MINUTES", "60"))

        # OIDC settings (recommended for all real deployments)
        self.oidc_issuer = os.getenv("OIDC_ISSUER", "")
        self.oidc_audience = os.getenv("OIDC_AUDIENCE", "")
        self.oidc_jwks_url = os.getenv("OIDC_JWKS_URL", "")
        self.oidc_email_claim = os.getenv("OIDC_EMAIL_CLAIM", "email")
        self.oidc_name_claim = os.getenv("OIDC_NAME_CLAIM", "name")

        # Legacy Google token-login (deprecated; prefer standard OIDC code flow in the frontend)
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
