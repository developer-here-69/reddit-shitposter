"""Load and validate environment + YAML configuration."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv

from src.exceptions import ConfigError, PublishSafetyError

# Default comes from Google AI Studio free-tier docs (Flash-Lite).
# Override with GEMINI_MODEL; model names change — check AI Studio.
DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite"
VALID_MODES = ("dry_run", "manual", "publish")
ROOT = Path(__file__).resolve().parent.parent


def parse_bool(value: str | None, default: bool) -> bool:
    if value is None or value.strip() == "":
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def parse_int(value: str | None, default: int, name: str) -> int:
    if value is None or value.strip() == "":
        return default
    try:
        parsed = int(value)
    except ValueError as exc:
        raise ConfigError(f"{name} must be an integer, got {value!r}") from exc
    if parsed < 1:
        raise ConfigError(f"{name} must be >= 1, got {parsed}")
    return parsed


def parse_float(value: str | None, default: float, name: str) -> float:
    if value is None or value.strip() == "":
        return default
    try:
        parsed = float(value)
    except ValueError as exc:
        raise ConfigError(f"{name} must be a number, got {value!r}") from exc
    if not 0 < parsed <= 1:
        raise ConfigError(f"{name} must be between 0 and 1 exclusive of 0, got {parsed}")
    return parsed


@dataclass
class LengthSpec:
    min_chars: int
    max_chars: int


@dataclass
class Category:
    name: str
    prompt: str = ""


@dataclass
class TopicConfig:
    subreddit: str
    description: str
    rules_summary: str
    categories: list[Category]
    writing_styles: list[str]
    post_lengths: dict[str, LengthSpec]
    flair_id: str | None = None
    flair_text: str | None = None
    allow_urls: bool = False
    banned_phrases: list[str] = field(default_factory=list)
    ai_disclosure: str = ""
    similarity_threshold: float = 0.85


@dataclass
class Settings:
    gemini_api_key: str
    gemini_model: str
    reddit_client_id: str
    reddit_client_secret: str
    reddit_username: str
    reddit_password: str
    reddit_user_agent: str
    subreddit: str
    mode: str
    posting_enabled: bool
    dry_run: bool
    max_posts_per_day: int
    db_path: Path
    drafts_dir: Path
    topics_path: Path
    topics: TopicConfig
    similarity_threshold: float
    fake_generator: bool
    reddit_ratelimit_seconds: int = 30

    def can_publish(self) -> bool:
        return self.mode == "publish" and self.posting_enabled and not self.dry_run


def load_topics(path: Path) -> TopicConfig:
    if not path.is_file():
        raise ConfigError(f"Topics file not found: {path}")
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    if not isinstance(raw, dict):
        raise ConfigError("topics.yaml must be a mapping")

    categories_raw = raw.get("categories") or []
    categories: list[Category] = []
    for item in categories_raw:
        if isinstance(item, str):
            categories.append(Category(name=item))
        elif isinstance(item, dict) and "name" in item:
            categories.append(Category(name=str(item["name"]), prompt=str(item.get("prompt", ""))))
        else:
            raise ConfigError("Each category must be a string or a mapping with 'name'")
    if not categories:
        raise ConfigError("topics.yaml needs at least one category")

    styles = [str(s) for s in (raw.get("writing_styles") or ["casual"])]
    lengths_raw = raw.get("post_lengths") or {
        "medium": {"min_chars": 400, "max_chars": 1500},
    }
    lengths: dict[str, LengthSpec] = {}
    for name, spec in lengths_raw.items():
        lengths[str(name)] = LengthSpec(
            min_chars=int(spec["min_chars"]),
            max_chars=int(spec["max_chars"]),
        )

    flair_id = raw.get("flair_id")
    flair_text = raw.get("flair_text")
    return TopicConfig(
        subreddit=str(raw.get("subreddit") or ""),
        description=str(raw.get("description") or ""),
        rules_summary=str(raw.get("rules_summary") or ""),
        categories=categories,
        writing_styles=styles,
        post_lengths=lengths,
        flair_id=str(flair_id) if flair_id else None,
        flair_text=str(flair_text) if flair_text else None,
        allow_urls=bool(raw.get("allow_urls", False)),
        banned_phrases=[str(p) for p in (raw.get("banned_phrases") or [])],
        ai_disclosure=str(raw.get("ai_disclosure") or "").strip(),
        similarity_threshold=float(raw.get("similarity_threshold") or 0.85),
    )


def load_settings(
    environ: dict[str, str] | None = None,
    *,
    load_env_file: bool = True,
) -> Settings:
    if load_env_file:
        load_dotenv(ROOT / ".env")
    env: dict[str, str] = dict(os.environ if environ is None else environ)

    mode = (env.get("MODE") or "dry_run").strip().lower()
    if mode not in VALID_MODES:
        raise ConfigError(f"MODE must be one of {VALID_MODES}, got {mode!r}")

    posting_enabled = parse_bool(env.get("POSTING_ENABLED"), False)
    dry_run = parse_bool(env.get("DRY_RUN"), True)
    fake_generator = parse_bool(env.get("FAKE_GENERATOR"), False)

    topics_path = Path(env.get("TOPICS_PATH") or ROOT / "config" / "topics.yaml")
    topics = load_topics(topics_path)

    subreddit = (env.get("SUBREDDIT") or topics.subreddit or "").strip()
    if not subreddit:
        raise ConfigError("SUBREDDIT is required (env var or topics.yaml)")

    db_path = Path(env.get("DB_PATH") or ROOT / "data" / "automation.db")
    drafts_dir = Path(env.get("DRAFTS_DIR") or ROOT / "drafts")

    similarity = parse_float(
        env.get("SIMILARITY_THRESHOLD"),
        topics.similarity_threshold,
        "SIMILARITY_THRESHOLD",
    )

    settings = Settings(
        gemini_api_key=(env.get("GEMINI_API_KEY") or "").strip(),
        gemini_model=(env.get("GEMINI_MODEL") or DEFAULT_GEMINI_MODEL).strip(),
        reddit_client_id=(env.get("REDDIT_CLIENT_ID") or "").strip(),
        reddit_client_secret=(env.get("REDDIT_CLIENT_SECRET") or "").strip(),
        reddit_username=(env.get("REDDIT_USERNAME") or "").strip(),
        reddit_password=(env.get("REDDIT_PASSWORD") or "").strip(),
        reddit_user_agent=(
            env.get("REDDIT_USER_AGENT")
            or "python:reddit-ai-automation:v1.0 (by /u/YOUR_USERNAME)"
        ).strip(),
        subreddit=subreddit.lstrip("r/"),
        mode=mode,
        posting_enabled=posting_enabled,
        dry_run=dry_run,
        max_posts_per_day=parse_int(env.get("MAX_POSTS_PER_DAY"), 3, "MAX_POSTS_PER_DAY"),
        db_path=db_path,
        drafts_dir=drafts_dir,
        topics_path=topics_path,
        topics=topics,
        similarity_threshold=similarity,
        fake_generator=fake_generator,
        reddit_ratelimit_seconds=parse_int(
            env.get("REDDIT_RATELIMIT_SECONDS"), 30, "REDDIT_RATELIMIT_SECONDS"
        ),
    )
    validate_settings(settings)
    return settings


def validate_settings(settings: Settings) -> None:
    if settings.mode == "publish":
        missing_flags: list[str] = []
        if not settings.posting_enabled:
            missing_flags.append("POSTING_ENABLED=true")
        if settings.dry_run:
            missing_flags.append("DRY_RUN=false")
        if missing_flags:
            raise PublishSafetyError(
                "Publish mode refused: set MODE=publish, POSTING_ENABLED=true, and "
                f"DRY_RUN=false together. Missing/incorrect: {', '.join(missing_flags)}"
            )
        _require_reddit_creds(settings)

    if settings.mode != "publish":
        if settings.posting_enabled and not settings.dry_run:
            raise PublishSafetyError(
                f"MODE={settings.mode} will never call Reddit. Set MODE=publish as well "
                "if you intended to publish."
            )


def _require_reddit_creds(settings: Settings) -> None:
    missing: list[str] = []
    for name, value in (
        ("REDDIT_CLIENT_ID", settings.reddit_client_id),
        ("REDDIT_CLIENT_SECRET", settings.reddit_client_secret),
        ("REDDIT_USERNAME", settings.reddit_username),
        ("REDDIT_PASSWORD", settings.reddit_password),
        ("REDDIT_USER_AGENT", settings.reddit_user_agent),
    ):
        if not value or "YOUR_" in value:
            missing.append(name)
    if missing:
        raise ConfigError(
            "Publish mode requires Reddit script-app credentials: " + ", ".join(missing)
        )


def require_gemini_key(settings: Settings) -> None:
    if settings.fake_generator:
        return
    if not settings.gemini_api_key or settings.gemini_api_key.startswith("YOUR_"):
        raise ConfigError(
            "GEMINI_API_KEY is missing. Get a free key from Google AI Studio "
            "(https://aistudio.google.com/apikey) with no billing required, "
            "or set FAKE_GENERATOR=true for a local demo."
        )


def settings_to_env_dict(settings: Settings) -> dict[str, str]:
    """Values used only for log redaction."""
    return {
        "GEMINI_API_KEY": settings.gemini_api_key,
        "REDDIT_CLIENT_ID": settings.reddit_client_id,
        "REDDIT_CLIENT_SECRET": settings.reddit_client_secret,
        "REDDIT_PASSWORD": settings.reddit_password,
        "REDDIT_USERNAME": settings.reddit_username,
    }


def pick_length(topics: TopicConfig, name: str | None = None) -> tuple[str, LengthSpec]:
    if name and name in topics.post_lengths:
        return name, topics.post_lengths[name]
    # Prefer medium when present.
    if "medium" in topics.post_lengths:
        return "medium", topics.post_lengths["medium"]
    key = next(iter(topics.post_lengths))
    return key, topics.post_lengths[key]


def as_prompt_context(topics: TopicConfig) -> dict[str, Any]:
    return {
        "description": topics.description,
        "rules_summary": topics.rules_summary,
        "categories": [c.name for c in topics.categories],
        "styles": topics.writing_styles,
    }
