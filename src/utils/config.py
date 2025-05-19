from functools import lru_cache
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MODE: str = "PT"
    DATABASE_URL: str
    JWT_SECRET: str = "change_me"
    SUB_RATE_PER_FT2: float = 3

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

@lru_cache
def get_settings():
    return Settings() 