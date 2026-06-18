from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://openbron:changeme@db:5432/openbron"
    redis_url: str = "redis://redis:6379/0"
    celery_broker_url: str = "redis://redis:6379/0"
    celery_result_backend: str = "redis://redis:6379/0"
    celery_worker_concurrency: int = 4
    celery_task_max_retries: int = 3
    celery_task_rate_limit: int = 10

    proxy_url: str = "socks5h://127.0.0.1:1080"

    llm_provider: str = "openai"
    llm_api_key: Optional[str] = None
    llm_model: str = "gpt-4o"
    llm_endpoint: str = "https://api.openai.com/v1"

    embedding_provider: str = "openai"
    embedding_model: str = "text-embedding-3-small"
    embedding_api_key: Optional[str] = None
    embedding_endpoint: str = "https://api.openai.com/v1"

    whisper_provider: str = "local"
    whisper_model_size: str = "base"
    whisper_api_key: Optional[str] = None

    tesseract_path: str = "/usr/bin/tesseract"
    opencv_threads: int = 4

    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from: str = "noreply@openbron.local"

    slack_webhook_url: Optional[str] = None

    model_config = {"env_file": ".env", "case_sensitive": False}


settings = Settings()
