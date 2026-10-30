from __future__ import annotations

from src.database import Database
from src.generator import FakeGenerator, GeneratedPost
from src.main import generate_valid_post, run, write_draft_file
from src.reddit_client import classify_reddit_error
from src.validator import content_hash


def test_dry_run_saves_draft(settings) -> None:
    code = run(settings, generator=FakeGenerator())
    assert code == 0
    db = Database(settings.db_path)
    row = db.conn.execute("SELECT status, title FROM posts").fetchone()
    assert row["status"] == "draft"
    assert row["title"]
    db.close()


def test_manual_writes_markdown(settings) -> None:
    settings.mode = "manual"
    code = run(settings, generator=FakeGenerator())
    assert code == 0
    files = list(settings.drafts_dir.glob("*.md"))
    assert len(files) == 1
    text = files[0].read_text(encoding="utf-8")
    assert text.startswith("# ")
    assert "habit" in text.lower() or "Title" in text or len(text) > 20


def test_write_draft_file_format(tmp_path, settings) -> None:
    post = FakeGenerator().generate(category="discussion")
    path = write_draft_file(tmp_path, post, 7)
    text = path.read_text(encoding="utf-8")
    assert f"# {post.title}" in text
    assert post.body in text


def test_daily_cap_exits_zero(settings) -> None:
    db = Database(settings.db_path)
    for i in range(3):
        db.insert_post(
            category="discussion",
            title=f"Existing {i}",
            body="body",
            content_hash=f"h{i}",
            status="draft",
        )
    db.close()
    code = run(settings, generator=FakeGenerator())
    assert code == 0


def test_regenerate_after_validation_failure(settings) -> None:
    class Flaky:
        def __init__(self) -> None:
            self.n = 0

        def generate(self, **kwargs):
            self.n += 1
            if self.n == 1:
                return GeneratedPost(
                    title="",
                    body="too short",
                    category="discussion",
                    content_hash=content_hash("", "too short"),
                )
            return FakeGenerator().generate(**kwargs)

    db = Database(settings.db_path)
    post, _length = generate_valid_post(settings, db, Flaky())
    assert post.title
    db.close()


def test_gemini_error_handling_classified() -> None:
    class Boom(Exception):
        pass

    err = Boom("received 403 HTTP response Forbidden")
    assert classify_reddit_error(err) == "reddit_forbidden"
    assert classify_reddit_error(Boom("RATELIMIT")) == "reddit_rate_limit"
    assert classify_reddit_error(Boom("invalid flair id")) == "reddit_invalid_flair"
