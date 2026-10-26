"""Application configuration is read once here, never in handlers."""

from dataclasses import dataclass
from pathlib import Path
import os


ROOT_DIR = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Settings:
    app_env: str
    database_path: Path
    frontend_dist: Path
    log_level: str
    enable_deepseek_agent: bool
    deepseek_api_key: str
    deepseek_base_url: str
    deepseek_model: str
    deepseek_agent_timeout_seconds: int
    agent_runtime_dir: Path


def load_settings() -> Settings:
    database_value = os.getenv("DATABASE_PATH", "data/career-os.db")
    database_path = (ROOT_DIR / database_value).resolve()
    data_dir = (ROOT_DIR / "data").resolve()
    if data_dir not in database_path.parents and database_path != data_dir:
        raise RuntimeError("DATABASE_PATH must be inside the project's data directory")
    return Settings(
        app_env=os.getenv("APP_ENV", "local"),
        database_path=database_path,
        frontend_dist=ROOT_DIR / "frontend" / "dist",
        log_level=os.getenv("LOG_LEVEL", "INFO").upper(),
        enable_deepseek_agent=os.getenv("ENABLE_DEEPSEEK_AGENT", "false").lower() == "true",
        deepseek_api_key=os.getenv("DEEPSEEK_API_KEY", ""),
        deepseek_base_url=os.getenv("DEEPSEEK_BASE_URL", ""),
        deepseek_model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
        deepseek_agent_timeout_seconds=int(os.getenv("DEEPSEEK_AGENT_TIMEOUT_SECONDS", "600")),
        agent_runtime_dir=ROOT_DIR / "agent-runtime",
    )


settings = load_settings()
