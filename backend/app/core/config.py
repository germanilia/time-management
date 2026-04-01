import os
from pathlib import Path

import yaml


def _deep_merge(base: dict, override: dict) -> dict:
    """Recursively merge override into base, returning a new dict."""
    result = base.copy()
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
    return result


def _load_yaml(path: Path) -> dict:
    if not path.exists():
        return {}
    with open(path) as f:
        return yaml.safe_load(f) or {}


def load_config(environment: str | None = None) -> dict:
    """Load and merge YAML config files for the given environment.

    Merge order: base.env.yml -> {env}.env.yml -> base.secrets.yml -> {env}.secrets.yml
    """
    env = environment or os.getenv("APP_ENV", "dev")
    config_dir = Path(__file__).resolve().parents[3] / "config"

    merged: dict = {}
    for filename in [
        "base.env.yml",
        f"{env}.env.yml",
        "base.secrets.yml",
        f"{env}.secrets.yml",
    ]:
        merged = _deep_merge(merged, _load_yaml(config_dir / filename))

    return merged


class Settings:
    def __init__(self, environment: str | None = None) -> None:
        self._env = environment or os.getenv("APP_ENV", "dev")
        self._config = load_config(self._env)

        db = self._config.get("database", {})
        self.db_host: str = db.get("host", "localhost")
        self.db_port: int = int(db.get("port", 5432))
        self.db_name: str = db.get("name", "time-management")
        self.db_user: str = db.get("user", "postgres")
        self.db_password: str = db.get("password", "")

        jwt = self._config.get("jwt", {})
        self.jwt_secret_key: str = jwt.get("secret_key", "dev-secret-change-in-production")
        self.jwt_algorithm: str = jwt.get("algorithm", "HS256")
        self.jwt_expire_minutes: int = int(jwt.get("expire_minutes", 1440))

        cors = self._config.get("cors", {})
        self.cors_origins_list: list[str] = cors.get("origins", ["http://localhost:5173"])

    @property
    def environment(self) -> str:
        return self._env

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    @property
    def database_url_sync(self) -> str:
        """Sync URL for Alembic and database creation."""
        return (
            f"postgresql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    @property
    def server_url_no_db(self) -> str:
        """Connection URL to the server without a specific database (connects to 'postgres')."""
        return (
            f"postgresql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/postgres"
        )


settings = Settings()
