"""PRAW wrapper. Network is used only in real publish mode."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Protocol

from src.config import Settings, settings_to_env_dict
from src.logging_setup import RedactingFilter, collect_secrets

logger = logging.getLogger("reddit_ai")

MAX_REDDIT_ATTEMPTS = 2  # original + one retry, never indefinite


@dataclass
class SubmitResult:
    reddit_id: str
    reddit_url: str
    dry_run: bool


class RedditSubmitter(Protocol):
    def submit(self, title: str, body: str, flair_id: str | None, flair_text: str | None) -> SubmitResult:
        ...


def classify_reddit_error(exc: BaseException) -> str:
    name = type(exc).__name__
    text = str(exc)
    lowered = f"{name} {text}".lower()
    if "401" in lowered or "unauthorized" in lowered:
        return "reddit_unauthorized"
    if "403" in lowered or "forbidden" in lowered:
        return "reddit_forbidden"
    if "banned" in lowered:
        return "reddit_banned"
    if "ratelimit" in lowered or "too many" in lowered or "429" in lowered:
        return "reddit_rate_limit"
    if "flair" in lowered:
        return "reddit_invalid_flair"
    return f"reddit_error:{name}"


class DryRunReddit:
    def submit(self, title: str, body: str, flair_id: str | None, flair_text: str | None) -> SubmitResult:
        logger.info("Dry-run Reddit submit (no network): title=%r flair_id=%s", title, flair_id)
        return SubmitResult(reddit_id="dry_run", reddit_url="https://reddit.local/dry-run", dry_run=True)


class PrawReddit:
    def __init__(self, settings: Settings, reddit: Any | None = None) -> None:
        self.settings = settings
        self._reddit = reddit
        self._ensure_redaction()

    def _ensure_redaction(self) -> None:
        secrets = collect_secrets(settings_to_env_dict(self.settings))
        filt = RedactingFilter(secrets)
        for handler in logging.getLogger().handlers:
            handler.addFilter(filt)
        praw_log = logging.getLogger("praw")
        praw_log.addFilter(filt)

    def _client(self) -> Any:
        if self._reddit is not None:
            return self._reddit
        import praw

        self._reddit = praw.Reddit(
            client_id=self.settings.reddit_client_id,
            client_secret=self.settings.reddit_client_secret,
            username=self.settings.reddit_username,
            password=self.settings.reddit_password,
            user_agent=self.settings.reddit_user_agent,
            ratelimit_seconds=min(self.settings.reddit_ratelimit_seconds, 60),
        )
        return self._reddit

    def submit(self, title: str, body: str, flair_id: str | None, flair_text: str | None) -> SubmitResult:
        reddit = self._client()
        subreddit = reddit.subreddit(self.settings.subreddit)
        kwargs: dict[str, Any] = {"selftext": body}
        if flair_id:
            kwargs["flair_id"] = flair_id
        if flair_text:
            kwargs["flair_text"] = flair_text

        last_exc: BaseException | None = None
        for attempt in range(1, MAX_REDDIT_ATTEMPTS + 1):
            try:
                submission = subreddit.submit(title, **kwargs)
                reddit_id = str(getattr(submission, "id", "") or "")
                reddit_url = str(getattr(submission, "url", "") or getattr(submission, "permalink", "") or "")
                if reddit_url and reddit_url.startswith("/"):
                    reddit_url = "https://www.reddit.com" + reddit_url
                logger.info("Posted to Reddit id=%s (secrets redacted from logs)", reddit_id)
                return SubmitResult(reddit_id=reddit_id, reddit_url=reddit_url, dry_run=False)
            except Exception as exc:  # noqa: BLE001
                last_exc = exc
                kind = classify_reddit_error(exc)
                logger.error("Reddit submit failed (attempt %s/%s): %s", attempt, MAX_REDDIT_ATTEMPTS, kind)
                if attempt >= MAX_REDDIT_ATTEMPTS or kind in {
                    "reddit_unauthorized",
                    "reddit_forbidden",
                    "reddit_banned",
                    "reddit_invalid_flair",
                }:
                    raise RedditSubmitError(kind, str(exc)) from exc
        raise RedditSubmitError("reddit_error", str(last_exc))


class RedditSubmitError(RuntimeError):
    def __init__(self, kind: str, detail: str) -> None:
        super().__init__(f"{kind}: {detail}")
        self.kind = kind
        self.detail = detail
