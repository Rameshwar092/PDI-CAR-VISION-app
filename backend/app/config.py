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
    # disk | mongo | auto (auto = mongo on Vercel, disk elsewhere). See services/storage.py
    photo_storage: str = "auto"
    max_photo_mb: int = 8

    cors_origins: str = "http://localhost:5173"

    # Set ALLOW_INSECURE_SECRET=true only for quick local testing with the
    # default .env.example values. The app refuses to start without this
    # if JWT_SECRET still looks like the placeholder — see main.py.
    allow_insecure_secret: bool = False

    # ---- Customer report access (OTP login on the public "Get your PDI report" page)
    brand_name: str = "PDI Car Vision"
    otp_expire_minutes: int = 5
    otp_max_attempts: int = 5          # wrong guesses allowed per OTP
    otp_resend_seconds: int = 30       # minimum gap between two OTPs to the same number
    otp_max_per_hour: int = 5          # OTPs per mobile number per hour
    customer_token_minutes: int = 30   # how long the customer stays signed in after OTP

    # Firebase project id of the pdicarvision.in website. When set, customers who
    # verified their phone with Firebase Phone Auth on the website can open their
    # reports without a second OTP (POST /api/customer/firebase-login).
    firebase_project_id: str = ""
    firebase_max_login_age_minutes: int = 15   # the Firebase OTP must be this recent

    # SMS provider: console | msg91 | fast2sms | twilio  (see app/services/sms.py)
    sms_provider: str = "console"
    msg91_auth_key: str = ""
    msg91_otp_template_id: str = ""
    fast2sms_api_key: str = ""
    fast2sms_sender_id: str = ""
    fast2sms_template_id: str = ""
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()

INSECURE_DEFAULT_SECRETS = {"change-me-in-.env", "replace-with-a-long-random-string", ""}