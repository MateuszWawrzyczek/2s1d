from pathlib import Path

from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).parents[3]


class Settings(BaseSettings):
    DATABASE_URL: str
    DEBUG: bool = False
    SECRET_KEY: str

    model_config = {"env_file": BASE_DIR / ".env", "extra": "ignore"}


settings = Settings()
