"""Claim-before-publish orchestration. Never posts unless safety flags allow it."""

from __future__ import annotations

import logging
from collections.abc import Callable

from src.config import Settings
from src.database import Database, PostRow
from src.exceptions import PublishSafetyError, StuckClaimError, ValidationError
from src.generator import GeneratedPost
from src.reddit_client import (
    DryRunReddit,
    PrawReddit,
    RedditSubmitError,
    RedditSubmitter,
    SubmitResult,
)
from src.config import LengthSpec
from src.validator import validate_post

logger = logging.getLogger("reddit_ai")

PersistFn = Callable[[], None]


class Publisher:
    def __init__(
        self,
        settings: Settings,
        db: Database,
        reddit: RedditSubmitter | None = None,
        persist_fn: PersistFn | None = None,
    ) -> None:
        self.settings = settings
        self.db = db
        self.persist_fn = persist_fn or (lambda: None)
        if reddit is not None:
            self.reddit = reddit
        elif not settings.can_publish():
            self.reddit = DryRunReddit()
        else:
            self.reddit = PrawReddit(settings)

    def review_stuck_claims(self) -> list[PostRow]:
        stuck = self.db.mark_stuck_claimed_needs_review()
        if stuck:
            ids = ", ".join(str(r.id) for r in stuck)
            logger.error(
                "Found stuck claimed posts (ids=%s). Marked needs_review. "
                "A rerun will never double-post these.",
                ids,
            )
        return stuck

    def publish(
        self,
        post: GeneratedPost,
        length: LengthSpec,
        *,
        force_dry_run: bool = False,
    ) -> tuple[int, SubmitResult | None]:
        result = validate_post(post.title, post.body, self.settings.topics, length)
        result.raise_if_invalid()
        post.body = result.body

        if force_dry_run or not self.settings.can_publish():
            post_id = self.db.insert_post(
                category=post.category,
                title=post.title,
                body=post.body,
                content_hash=post.content_hash,
                status="draft",
            )
            fake = DryRunReddit().submit(
                post.title,
                post.body,
                self.settings.topics.flair_id,
                self.settings.topics.flair_text,
            )
            logger.info("Not publishing (mode=%s). Saved draft id=%s", self.settings.mode, post_id)
            return post_id, fake

        # CLAIM-BEFORE-PUBLISH: persist claimed, then call Reddit.
        post_id = self.db.insert_post(
            category=post.category,
            title=post.title,
            body=post.body,
            content_hash=post.content_hash,
            status="claimed",
        )
        logger.info("Claimed post id=%s; persisting state before Reddit call", post_id)
        self.persist_fn()
        try:
            submitted = self.reddit.submit(
                post.title,
                post.body,
                self.settings.topics.flair_id,
                self.settings.topics.flair_text,
            )
        except (RedditSubmitError, ValidationError) as exc:
            self.db.mark_failed(post_id, str(exc))
            self.persist_fn()
            raise
        except Exception as exc:  # noqa: BLE001
            self.db.mark_failed(post_id, str(exc))
            self.persist_fn()
            raise RedditSubmitError("reddit_error", str(exc)) from exc
        self.db.mark_published(post_id, submitted.reddit_id, submitted.reddit_url)
        self.persist_fn()
        return post_id, submitted


def assert_publish_allowed(settings: Settings) -> None:
    if not settings.can_publish():
        raise PublishSafetyError(
            "Publish blocked. Need MODE=publish AND POSTING_ENABLED=true AND DRY_RUN=false."
        )


def abort_if_stuck(stuck: list[PostRow], *, publishing: bool) -> None:
    if publishing and stuck:
        raise StuckClaimError(
            "Previous run left claimed post(s). Not calling Reddit. "
            f"Review ids: {[r.id for r in stuck]}"
        )
