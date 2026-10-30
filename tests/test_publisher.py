from __future__ import annotations

import pytest

from src.config import LengthSpec
from src.database import Database
from src.exceptions import PublishSafetyError, StuckClaimError
from src.generator import GeneratedPost, FakeGenerator
from src.publisher import Publisher, abort_if_stuck, assert_publish_allowed
from src.reddit_client import DryRunReddit, RedditSubmitError, SubmitResult
from src.validator import content_hash


class RecordingReddit:
    def __init__(self, fail_times: int = 0) -> None:
        self.calls = 0
        self.fail_times = fail_times

    def submit(self, title: str, body: str, flair_id: str | None, flair_text: str | None) -> SubmitResult:
        self.calls += 1
        if self.calls <= self.fail_times:
            raise RedditSubmitError("reddit_forbidden", "forbidden")
        return SubmitResult(reddit_id="abc123", reddit_url="https://reddit.com/abc123", dry_run=False)


def _post() -> GeneratedPost:
    gen = FakeGenerator()
    p = gen.generate(category="discussion")
    return p


def test_dry_run_publish_never_calls_reddit(settings) -> None:
    db = Database(settings.db_path)
    reddit = RecordingReddit()
    publisher = Publisher(settings, db, reddit=reddit)
    length = LengthSpec(180, 700)
    post_id, result = publisher.publish(_post(), length, force_dry_run=True)
    assert result is not None
    assert result.dry_run is True
    assert reddit.calls == 0
    assert db.get(post_id).status == "draft"
    db.close()


def test_claim_before_publish_persist_order(settings) -> None:
    settings.mode = "publish"
    settings.posting_enabled = True
    settings.dry_run = False
    db = Database(settings.db_path)
    reddit = RecordingReddit()
    events: list[str] = []

    original_submit = reddit.submit

    def wrapped_submit(*args, **kwargs):
        events.append("reddit")
        return original_submit(*args, **kwargs)

    reddit.submit = wrapped_submit  # type: ignore[method-assign]
    publisher = Publisher(settings, db, reddit=reddit, persist_fn=lambda: events.append("persist"))
    post_id, result = publisher.publish(_post(), LengthSpec(180, 700))
    assert events[0] == "persist"
    assert "reddit" in events
    assert result is not None
    assert result.reddit_id == "abc123"
    assert db.get(post_id).status == "published"
    db.close()


def test_reddit_failure_marks_failed_and_does_not_retry_forever(settings) -> None:
    settings.mode = "publish"
    settings.posting_enabled = True
    settings.dry_run = False
    db = Database(settings.db_path)
    reddit = RecordingReddit(fail_times=99)
    publisher = Publisher(settings, db, reddit=reddit, persist_fn=lambda: None)
    with pytest.raises(RedditSubmitError):
        publisher.publish(_post(), LengthSpec(180, 700))
    row = db.conn.execute("SELECT status FROM posts").fetchone()
    assert row["status"] == "failed"
    assert reddit.calls == 1
    db.close()


def test_stuck_claimed_blocks_publish_not_repost(settings) -> None:
    db = Database(settings.db_path)
    db.insert_post(
        category="discussion",
        title="Old claimed",
        body="body",
        content_hash="old",
        status="claimed",
    )
    publisher = Publisher(settings, db, reddit=RecordingReddit())
    stuck = publisher.review_stuck_claims()
    with pytest.raises(StuckClaimError):
        abort_if_stuck(stuck, publishing=True)
    abort_if_stuck(stuck, publishing=False)
    db.close()


def test_assert_publish_allowed(settings) -> None:
    with pytest.raises(PublishSafetyError):
        assert_publish_allowed(settings)
    settings.mode = "publish"
    settings.posting_enabled = True
    settings.dry_run = False
    assert_publish_allowed(settings)
