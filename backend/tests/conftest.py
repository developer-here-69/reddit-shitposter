from __future__ import annotations

from pathlib import Path

import pytest

from src.config import Settings, load_topics

ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture
def topics():
    return load_topics(ROOT / "config" / "topics.yaml")


@pytest.fixture
def settings(tmp_path: Path, topics) -> Settings:
    return Settings(
        gemini_api_key="",
        gemini_model="gemini-2.5-flash-lite",
        reddit_client_id="",
        reddit_client_secret="",
        reddit_username="",
        reddit_password="",
        reddit_user_agent="python:reddit-ai-automation-tests:v1.0 (by /u/test)",
        subreddit="test",
        mode="dry_run",
        posting_enabled=False,
        dry_run=True,
        max_posts_per_day=3,
        db_path=tmp_path / "test.db",
        drafts_dir=tmp_path / "drafts",
        topics_path=ROOT / "config" / "topics.yaml",
        topics=topics,
        similarity_threshold=0.85,
        fake_generator=True,
    )
