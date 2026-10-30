from __future__ import annotations

import pytest

from src.database import Database
from src.exceptions import DailyCapError, DuplicateError
from src.validator import content_hash


def test_insert_and_recent_titles(tmp_path) -> None:
    db = Database(tmp_path / "db.sqlite")
    h = content_hash("Hello World", "body")
    post_id = db.insert_post(
        category="discussion",
        title="Hello World!",
        body="body",
        content_hash=h,
        status="draft",
    )
    assert post_id == 1
    assert db.recent_titles() == ["Hello World!"]
    db.close()


def test_exact_and_normalized_duplicate(tmp_path) -> None:
    db = Database(tmp_path / "db.sqlite")
    db.insert_post(
        category="discussion",
        title="Hello World!",
        body="body",
        content_hash=content_hash("Hello World!", "body"),
        status="draft",
    )
    with pytest.raises(DuplicateError):
        db.assert_not_duplicate(
            title="hello world",
            content_hash=content_hash("other", "x"),
            similarity_threshold=0.85,
        )
    with pytest.raises(DuplicateError):
        db.assert_not_duplicate(
            title="Completely different",
            content_hash=content_hash("Hello World!", "body"),
            similarity_threshold=0.85,
        )
    db.close()


def test_similar_title_detected(tmp_path) -> None:
    db = Database(tmp_path / "db.sqlite")
    db.insert_post(
        category="discussion",
        title="What small habit improved your week?",
        body="body",
        content_hash="aaa",
        status="draft",
    )
    with pytest.raises(DuplicateError, match="similar"):
        db.assert_not_duplicate(
            title="What small habit improved your week today?",
            content_hash="bbb",
            similarity_threshold=0.7,
        )
    db.close()


def test_daily_cap(tmp_path) -> None:
    db = Database(tmp_path / "db.sqlite")
    for i in range(3):
        db.insert_post(
            category="discussion",
            title=f"Title number {i}",
            body="body",
            content_hash=f"hash-{i}",
            status="draft",
        )
    with pytest.raises(DailyCapError):
        db.enforce_daily_cap(3)
    db.close()


def test_stuck_claimed_needs_review(tmp_path) -> None:
    db = Database(tmp_path / "db.sqlite")
    post_id = db.insert_post(
        category="discussion",
        title="Claimed post",
        body="body",
        content_hash="claimed-hash",
        status="claimed",
    )
    stuck = db.mark_stuck_claimed_needs_review()
    assert len(stuck) == 1
    row = db.get(post_id)
    assert row is not None
    assert row.status == "needs_review"
    assert db.stuck_claimed() == []
    db.close()
