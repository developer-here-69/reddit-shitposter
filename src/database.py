"""SQLite storage, duplicate detection, daily cap, and claim-before-publish."""

from __future__ import annotations

import difflib
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from src.exceptions import DailyCapError, DuplicateError
from src.validator import normalize_title

SCHEMA = """
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    normalized_title TEXT NOT NULL,
    body TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    status TEXT NOT NULL,
    reddit_id TEXT,
    reddit_url TEXT,
    error TEXT,
    created_at TEXT NOT NULL,
    published_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_normalized_title ON posts(normalized_title);
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_content_hash ON posts(content_hash);
"""

COUNTED_STATUSES = ("draft", "claimed", "published", "needs_review")
ACTIVE_STATUSES = ("draft", "claimed", "published", "needs_review", "failed", "skipped")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def utc_today_start() -> str:
    return utc_now().date().isoformat()


@dataclass
class PostRow:
    id: int
    category: str
    title: str
    normalized_title: str
    body: str
    content_hash: str
    status: str
    reddit_id: str | None
    reddit_url: str | None
    error: str | None
    created_at: str
    published_at: str | None


class Database:
    def __init__(self, path: Path) -> None:
        self.path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(str(path))
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")
        self._init_schema()

    def _init_schema(self) -> None:
        self.conn.executescript(SCHEMA)
        self.conn.commit()

    def close(self) -> None:
        self.conn.close()

    def commit(self) -> None:
        self.conn.commit()

    def count_today(self, *, statuses: tuple[str, ...] = COUNTED_STATUSES) -> int:
        day = utc_today_start()
        placeholders = ",".join("?" * len(statuses))
        row = self.conn.execute(
            f"""
            SELECT COUNT(*) AS n FROM posts
            WHERE substr(created_at, 1, 10) = ?
              AND status IN ({placeholders})
            """,
            (day, *statuses),
        ).fetchone()
        return int(row["n"])

    def enforce_daily_cap(self, max_posts: int) -> None:
        count = self.count_today()
        if count >= max_posts:
            raise DailyCapError(
                f"Daily cap reached: {count}/{max_posts} posts already stored for UTC "
                f"{utc_today_start()}. Refusing to draft or publish more."
            )

    def recent_titles(self, limit: int = 50) -> list[str]:
        rows = self.conn.execute(
            "SELECT title FROM posts ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [r["title"] for r in rows]

    def find_duplicate(
        self,
        *,
        normalized: str,
        content_hash: str,
        title: str,
        similarity_threshold: float,
    ) -> str | None:
        exact = self.conn.execute(
            "SELECT id, title FROM posts WHERE normalized_title = ? OR content_hash = ?",
            (normalized, content_hash),
        ).fetchone()
        if exact:
            return f"exact/normalized duplicate of post id={exact['id']}: {exact['title']!r}"
        for existing in self.recent_titles(50):
            ratio = difflib.SequenceMatcher(None, normalized, normalize_title(existing)).ratio()
            if ratio >= similarity_threshold:
                return (
                    f"similar title (ratio={ratio:.2f} >= {similarity_threshold}) "
                    f"vs {existing!r}"
                )
        return None

    def assert_not_duplicate(
        self,
        *,
        title: str,
        content_hash: str,
        similarity_threshold: float,
    ) -> None:
        reason = self.find_duplicate(
            normalized=normalize_title(title),
            content_hash=content_hash,
            title=title,
            similarity_threshold=similarity_threshold,
        )
        if reason:
            raise DuplicateError(reason)

    def insert_post(
        self,
        *,
        category: str,
        title: str,
        body: str,
        content_hash: str,
        status: str,
        error: str | None = None,
    ) -> int:
        now = utc_now().isoformat()
        normalized = normalize_title(title)
        try:
            cur = self.conn.execute(
                """
                INSERT INTO posts (
                    category, title, normalized_title, body, content_hash,
                    status, error, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (category, title, normalized, body, content_hash, status, error, now),
            )
            self.conn.commit()
        except sqlite3.IntegrityError as exc:
            raise DuplicateError(f"unique constraint: {exc}") from exc
        return int(cur.lastrowid)

    def set_status(
        self,
        post_id: int,
        status: str,
        *,
        error: str | None = None,
        reddit_id: str | None = None,
        reddit_url: str | None = None,
        published: bool = False,
    ) -> None:
        published_at = utc_now().isoformat() if published else None
        self.conn.execute(
            """
            UPDATE posts
            SET status = ?, error = ?, reddit_id = ?, reddit_url = ?,
                published_at = COALESCE(?, published_at)
            WHERE id = ?
            """,
            (status, error, reddit_id, reddit_url, published_at, post_id),
        )
        self.conn.commit()

    def claim(self, post_id: int) -> None:
        self.set_status(post_id, "claimed")

    def mark_published(self, post_id: int, reddit_id: str, reddit_url: str) -> None:
        self.set_status(
            post_id,
            "published",
            reddit_id=reddit_id,
            reddit_url=reddit_url,
            published=True,
        )

    def mark_failed(self, post_id: int, error: str) -> None:
        self.set_status(post_id, "failed", error=error)

    def stuck_claimed(self) -> list[PostRow]:
        rows = self.conn.execute(
            "SELECT * FROM posts WHERE status = 'claimed' ORDER BY id"
        ).fetchall()
        return [self._row(r) for r in rows]

    def mark_stuck_claimed_needs_review(self) -> list[PostRow]:
        stuck = self.stuck_claimed()
        for row in stuck:
            self.set_status(
                row.id,
                "needs_review",
                error=(
                    "Stuck in claimed from a previous run. Not reposting. "
                    "Check Reddit manually, then set status to published or failed."
                ),
            )
        return stuck

    def get(self, post_id: int) -> PostRow | None:
        row = self.conn.execute("SELECT * FROM posts WHERE id = ?", (post_id,)).fetchone()
        return self._row(row) if row else None

    def _row(self, row: sqlite3.Row) -> PostRow:
        return PostRow(
            id=row["id"],
            category=row["category"],
            title=row["title"],
            normalized_title=row["normalized_title"],
            body=row["body"],
            content_hash=row["content_hash"],
            status=row["status"],
            reddit_id=row["reddit_id"],
            reddit_url=row["reddit_url"],
            error=row["error"],
            created_at=row["created_at"],
            published_at=row["published_at"],
        )
