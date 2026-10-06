from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # MongoDB Atlas connection string, e.g.
    # mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "pdi_car_vision"

    jwt_secret: str = "change-me-in-.env"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480  # 8 hour shift

    # Photos are saved as files here, NOT embedded in MongoDB documents.
    # A single 16MB Mongo document limit makes storing base64 photos inside
    # a report unsafe at scale — this keeps each report document to a few
    # tens of KB regardless of how many photos are attached.
    upload_dir: str = "uploads"
    max_photo_mb: int = 8

    cors_origins: str = "http://localhost:5173"

    # Set ALLOW_INSECURE_SECRET=true only for quick local testing with the
    # default .env.example values. The app refuses to start without this
    # if JWT_SECRET still looks like the placeholder — see main.py.
    allow_insecure_secret: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()

INSECURE_DEFAULT_SECRETS = {"change-me-in-.env", "replace-with-a-long-random-string", ""}
