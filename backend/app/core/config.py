from pathlib import Path

from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).parents[3]


class Settings(BaseSettings):
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str
    POSTGRES_PORT: int

    SECRET_KEY: str
    DEBUG: bool = False

    DATABASE_URL: str

    model_config = {"env_file": BASE_DIR / ".env", "extra": "ignore"}


settings = Settings()
