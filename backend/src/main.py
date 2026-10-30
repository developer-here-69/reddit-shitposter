"""Entry point: generate a draft, optionally write a file, optionally publish."""

from __future__ import annotations

import argparse
import logging
import os
import random
import sys
from collections.abc import Callable
from pathlib import Path

from src.config import (
    Settings,
    load_settings,
    pick_length,
    require_gemini_key,
    settings_to_env_dict,
)
from src.database import Database
from src.exceptions import (
    ConfigError,
    DailyCapError,
    DuplicateError,
    GenerationError,
    QuotaExhaustedError,
    StuckClaimError,
    ValidationError,
)
from src.generator import FakeGenerator, GeminiGenerator, GeneratedPost
from src.logging_setup import collect_secrets, setup_logging
from src.publisher import Publisher, abort_if_stuck
from src.validator import validate_post

logger = logging.getLogger("reddit_ai")

GeneratorFactory = Callable[[Settings], object]


def write_draft_file(drafts_dir: Path, post: GeneratedPost, post_id: int) -> Path:
    drafts_dir.mkdir(parents=True, exist_ok=True)
    path = drafts_dir / f"{post_id:04d}-{post.content_hash[:8]}.md"
    content = f"# {post.title}\n\n{post.body}\n"
    path.write_text(content, encoding="utf-8")
    return path


def append_step_summary(text: str) -> None:
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if not summary:
        return
    with open(summary, "a", encoding="utf-8") as handle:
        handle.write(text.rstrip() + "\n")


def choose_topic(settings: Settings, rng: random.Random) -> tuple[str, str, str]:
    category = rng.choice(settings.topics.categories).name
    style = rng.choice(settings.topics.writing_styles)
    length_name, _ = pick_length(settings.topics)
    # Rotate length names when more than one exists.
    length_name = rng.choice(list(settings.topics.post_lengths))
    return category, style, length_name


def make_generator(settings: Settings) -> object:
    if settings.fake_generator:
        return FakeGenerator()
    require_gemini_key(settings)
    return GeminiGenerator(settings)


def generate_valid_post(
    settings: Settings,
    db: Database,
    generator: object,
    *,
    max_attempts: int = 3,
) -> tuple[GeneratedPost, str]:
    category, style, length_name = choose_topic(settings, random.Random())
    length = settings.topics.post_lengths[length_name]
    previous = db.recent_titles(50)
    last_error = "unknown"
    for attempt in range(1, max_attempts + 1):
        post: GeneratedPost = generator.generate(  # type: ignore[attr-defined]
            category=category,
            style=style,
            length_name=length_name,
            length=length,
            previous_titles=previous,
        )
        if not post.category:
            post.category = category
        result = validate_post(post.title, post.body, settings.topics, length)
        if not result.ok:
            last_error = "; ".join(result.errors)
            logger.warning("Validation failed (attempt %s/%s): %s", attempt, max_attempts, last_error)
            continue
        post.body = result.body
        try:
            db.assert_not_duplicate(
                title=post.title,
                content_hash=post.content_hash,
                similarity_threshold=settings.similarity_threshold,
            )
        except DuplicateError as exc:
            last_error = str(exc)
            logger.warning("Duplicate (attempt %s/%s): %s", attempt, max_attempts, last_error)
            continue
        return post, length_name
    db.insert_post(
        category=category,
        title=f"(generation failed {os.urandom(4).hex()})",
        body=last_error,
        content_hash=f"failed-{os.urandom(8).hex()}",
        status="failed",
        error=last_error,
    )
    raise GenerationError(
        f"Gave up after {max_attempts} generation attempts. Last error: {last_error}"
    )


def default_persist(settings: Settings) -> Callable[[], None]:
    def _persist() -> None:
        # SQLite is already committed. Optionally push the state branch in CI.
        if os.environ.get("STATE_SYNC_ON_PERSIST", "").lower() in {"1", "true", "yes"}:
            script = Path(__file__).resolve().parent.parent / "scripts" / "state_sync.py"
            if script.is_file():
                import subprocess

                subprocess.run([sys.executable, str(script), "push"], check=False)

    return _persist


def run(settings: Settings, *, generator: object | None = None) -> int:
    secrets = collect_secrets(settings_to_env_dict(settings))
    setup_logging(secrets)
    logger.info(
        "Starting mode=%s posting_enabled=%s dry_run=%s subreddit=r/%s model=%s",
        settings.mode,
        settings.posting_enabled,
        settings.dry_run,
        settings.subreddit,
        settings.gemini_model,
    )

    db = Database(settings.db_path)
    try:
        publisher = Publisher(settings, db, persist_fn=default_persist(settings))
        stuck = publisher.review_stuck_claims()
        publishing = settings.can_publish()
        try:
            abort_if_stuck(stuck, publishing=publishing)
        except StuckClaimError as exc:
            append_step_summary(f"## Stuck claimed posts\n\n{exc}\n")
            logger.error("%s", exc)
            return 1

        try:
            db.enforce_daily_cap(settings.max_posts_per_day)
        except DailyCapError as exc:
            logger.warning("%s", exc)
            append_step_summary(f"## Daily cap\n\n{exc}\n")
            return 0

        gen = generator or make_generator(settings)
        try:
            post, length_name = generate_valid_post(settings, db, gen)
        except QuotaExhaustedError as exc:
            logger.warning("%s", exc)
            append_step_summary(f"## Gemini quota\n\n{exc}\n")
            return 0
        except GenerationError as exc:
            logger.error("%s", exc)
            append_step_summary(f"## Generation failed\n\n{exc}\n")
            return 1

        length = settings.topics.post_lengths[length_name]
        print("----- DRAFT -----")
        print(f"Title: {post.title}")
        print()
        print(post.body)
        print("-----------------")

        if settings.mode == "manual":
            post_id = db.insert_post(
                category=post.category,
                title=post.title,
                body=post.body,
                content_hash=post.content_hash,
                status="draft",
            )
            path = write_draft_file(settings.drafts_dir, post, post_id)
            logger.info("Manual mode: wrote %s", path)
            append_step_summary(
                f"## Manual draft `{path.name}`\n\n**Title:** {post.title}\n\n{post.body}\n"
            )
            return 0

        if settings.mode == "dry_run" or not settings.can_publish():
            post_id, _ = publisher.publish(post, length, force_dry_run=True)
            append_step_summary(
                f"## Dry-run draft id={post_id}\n\n**Title:** {post.title}\n\n{post.body}\n"
            )
            return 0

        post_id, submitted = publisher.publish(post, length)
        url = submitted.reddit_url if submitted else ""
        logger.info("Published id=%s url=%s", post_id, url)
        append_step_summary(f"## Published\n\n- db id: {post_id}\n- url: {url}\n")
        return 0
    finally:
        db.close()


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Reddit AI posting automation")
    parser.add_argument("--fake", action="store_true", help="Use a built-in fake generator (no Gemini)")
    parser.add_argument("--mode", choices=["dry_run", "manual", "publish"], help="Override MODE")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if args.mode:
        os.environ["MODE"] = args.mode
    if args.fake:
        os.environ["FAKE_GENERATOR"] = "true"
    try:
        settings = load_settings()
    except (ConfigError, Exception) as exc:
        if exc.__class__.__name__ in {"ConfigError", "PublishSafetyError"}:
            print(f"Configuration error: {exc}", file=sys.stderr)
            append_step_summary(f"## Configuration error\n\n{exc}\n")
            return 2
        raise
    try:
        return run(settings)
    except ConfigError as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        append_step_summary(f"## Configuration error\n\n{exc}\n")
        return 2
    except ValidationError as exc:
        logger.error("Validation: %s", exc)
        return 1


if __name__ == "__main__":
    sys.exit(main())
