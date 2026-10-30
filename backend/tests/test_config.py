from __future__ import annotations

from pathlib import Path

import pytest

from src.config import load_settings
from src.exceptions import ConfigError, PublishSafetyError

ROOT = Path(__file__).resolve().parent.parent


def _env(**overrides: str) -> dict[str, str]:
    base = {
        "MODE": "dry_run",
        "POSTING_ENABLED": "false",
        "DRY_RUN": "true",
        "SUBREDDIT": "test",
        "TOPICS_PATH": str(ROOT / "config" / "topics.yaml"),
        "MAX_POSTS_PER_DAY": "3",
        "GEMINI_MODEL": "gemini-2.5-flash-lite",
    }
    base.update(overrides)
    return base


def test_defaults_dry_run() -> None:
    settings = load_settings(_env(), load_env_file=False)
    assert settings.mode == "dry_run"
    assert settings.posting_enabled is False
    assert settings.dry_run is True
    assert settings.can_publish() is False


def test_publish_refused_without_three_flags() -> None:
    with pytest.raises(PublishSafetyError, match="POSTING_ENABLED"):
        load_settings(_env(MODE="publish", POSTING_ENABLED="false", DRY_RUN="false"), load_env_file=False)
    with pytest.raises(PublishSafetyError, match="DRY_RUN"):
        load_settings(_env(MODE="publish", POSTING_ENABLED="true", DRY_RUN="true"), load_env_file=False)


def test_publish_requires_reddit_creds() -> None:
    with pytest.raises(ConfigError, match="REDDIT_CLIENT_ID"):
        load_settings(
            _env(MODE="publish", POSTING_ENABLED="true", DRY_RUN="false"),
            load_env_file=False,
        )


def test_publish_ok_with_flags_and_creds(tmp_path: Path) -> None:
    settings = load_settings(
        _env(
            MODE="publish",
            POSTING_ENABLED="true",
            DRY_RUN="false",
            REDDIT_CLIENT_ID="cid",
            REDDIT_CLIENT_SECRET="csecret",
            REDDIT_USERNAME="someuser",
            REDDIT_PASSWORD="hunter2-not-real",
            REDDIT_USER_AGENT="python:tests:v1 (by /u/someuser)",
            DB_PATH=str(tmp_path / "x.db"),
        ),
        load_env_file=False,
    )
    assert settings.can_publish() is True


def test_invalid_mode() -> None:
    with pytest.raises(ConfigError, match="MODE"):
        load_settings(_env(MODE="spam"), load_env_file=False)


def test_gemini_key_required_unless_fake(settings) -> None:
    from src.config import require_gemini_key

    settings.fake_generator = False
    settings.gemini_api_key = ""
    with pytest.raises(ConfigError, match="GEMINI_API_KEY"):
        require_gemini_key(settings)
    settings.fake_generator = True
    require_gemini_key(settings)
