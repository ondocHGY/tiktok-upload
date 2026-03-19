from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # TikTok API
    TT_CLIENT_KEY: str = ""
    TT_CLIENT_SECRET: str = ""
    TT_REDIRECT_URI: str = "http://localhost:8000/auth/callback"

    # MySQL
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "tiktok_scheduler"

    # App
    SECRET_KEY: str = "change-me"
    ENCRYPTION_KEY: str = "change-me"
    VIDEO_DIR: str = "./videos"

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"mysql+aiomysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )


settings = Settings()
