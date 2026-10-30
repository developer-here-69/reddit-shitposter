"""Gemini post generation with structured JSON and a fallback parser."""

from __future__ import annotations

import json
import logging
import random
import re
import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from src.config import LengthSpec, Settings, TopicConfig
from src.exceptions import GenerationError, QuotaExhaustedError
from src.validator import content_hash, normalize_title

logger = logging.getLogger("reddit_ai")

SleepFn = Callable[[float], None]
NowFn = Callable[[], float]

POST_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "title": {
            "type": "string",
            "description": "Reddit post title, under 300 characters, not all caps.",
        },
        "body": {
            "type": "string",
            "description": "Reddit self-post body. End with a genuine open question.",
        },
        "category": {
            "type": "string",
            "description": "The topic category that was requested.",
        },
    },
    "required": ["title", "body"],
}

FENCE_RE = re.compile(r"```(?:json)?\s*([\s\S]*?)\s*```", re.IGNORECASE)
TRANSIENT_CODES = {408, 429, 500, 502, 503, 504}
QUOTA_MARKERS = (
    "quota",
    "resource_exhausted",
    "resource exhausted",
    "exceeded your current quota",
    "rpd",
    "daily limit",
    "free tier",
)


@dataclass
class GeneratedPost:
    title: str
    body: str
    category: str
    content_hash: str

    @property
    def normalized_title(self) -> str:
        return normalize_title(self.title)


def parse_gemini_response(raw: str, fallback_category: str = "") -> dict[str, str]:
    """Parse model output: plain JSON, fenced JSON, or a best-effort salvage."""
    text = (raw or "").strip()
    if not text:
        raise GenerationError("Empty model response")

    candidates = [text]
    fenced = FENCE_RE.findall(text)
    candidates.extend(fenced)

    brace = _extract_json_object(text)
    if brace:
        candidates.append(brace)

    last_error: Exception | None = None
    for candidate in candidates:
        try:
            data = json.loads(candidate)
        except json.JSONDecodeError as exc:
            last_error = exc
            continue
        if not isinstance(data, dict):
            last_error = GenerationError("JSON root is not an object")
            continue
        title = str(data.get("title") or "").strip()
        body = str(data.get("body") or data.get("selftext") or data.get("text") or "").strip()
        category = str(data.get("category") or fallback_category).strip()
        if title and body:
            return {"title": title, "body": body, "category": category}

    salvaged = _salvage_malformed(text, fallback_category)
    if salvaged:
        return salvaged
    raise GenerationError(f"Could not parse Gemini JSON: {last_error}")


def _extract_json_object(text: str) -> str | None:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    return text[start : end + 1]


def _salvage_malformed(text: str, fallback_category: str) -> dict[str, str] | None:
    """Pull title/body from slightly malformed JSON-ish text."""
    title_m = re.search(r'"title"\s*:\s*"(.*?)"', text, re.DOTALL)
    body_m = re.search(r'"body"\s*:\s*"(.*?)"', text, re.DOTALL)
    if not title_m or not body_m:
        return None
    title = _unescape(title_m.group(1)).strip()
    body = _unescape(body_m.group(1)).strip()
    if not title or not body:
        return None
    return {"title": title, "body": body, "category": fallback_category}


def _unescape(value: str) -> str:
    return value.replace("\\n", "\n").replace('\\"', '"').replace("\\\\", "\\")


def build_prompt(
    *,
    subreddit: str,
    topics: TopicConfig,
    category: str,
    style: str,
    length_name: str,
    length: LengthSpec,
    previous_titles: list[str],
) -> str:
    previous = "\n".join(f"- {t}" for t in previous_titles[:50]) or "(none yet)"
    extra = ""
    for cat in topics.categories:
        if cat.name == category and cat.prompt:
            extra = cat.prompt
            break
    return f"""Write one Reddit self-post for r/{subreddit}.

Subreddit description:
{topics.description}

Rules summary (you must follow these):
{topics.rules_summary}

Category: {category}
{extra}

Writing style: {style}
Target body length: {length.min_chars}-{length.max_chars} characters.

Return JSON with keys title and body (and category).

Writing rules:
- Write like an actual human Reddit user typing casually from their phone. No corporate or robotic speak.
- STRICTLY ZERO AI SLOP: Absolutely forbidden to use AI clichés like "delve into", "a testament to", "in a world where", "it compounds over time", "furthermore", "vital", "at the end of the day", or generic LinkedIn-style productivity advice.
- Natural conversational tone: feel free to use natural everyday expressions, light humor, witty observations, and natural Hinglish/English banter (words like 'yaar', 'bhai', 'scene', 'jugaad', 'arrey' when natural).
- Keep paragraphs short and conversational — avoid textbook essays.
- Discussion-oriented: end with an engaging, casual open question that makes fellow community members want to comment and share their own stories.
- No spam, no promotion, no links.
- Do not repeat or closely rephrase earlier titles.
- Do not use ALL CAPS titles or obvious clickbait.

Earlier titles to avoid repeating:
{previous}
"""


def _error_code(exc: BaseException) -> int | None:
    for attr in ("code", "status_code", "status"):
        value = getattr(exc, attr, None)
        if isinstance(value, int):
            return value
        if isinstance(value, str) and value.isdigit():
            return int(value)
    return None


def _is_timeout(exc: BaseException) -> bool:
    name = type(exc).__name__.lower()
    text = str(exc).lower()
    return "timeout" in name or "timed out" in text or "timeout" in text


def _is_quota_exhausted(exc: BaseException) -> bool:
    text = str(exc).lower()
    return any(marker in text for marker in QUOTA_MARKERS)


def retry_with_backoff(
    fn: Callable[[], Any],
    *,
    max_attempts: int = 3,
    sleep: SleepFn = time.sleep,
    rng: random.Random | None = None,
) -> Any:
    """Retry transient errors with exponential backoff + jitter. Max 3 attempts."""
    rng = rng or random.Random()
    last_exc: BaseException | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            return fn()
        except QuotaExhaustedError:
            raise
        except Exception as exc:  # noqa: BLE001 — classify below
            last_exc = exc
            code = _error_code(exc)
            transient = code in TRANSIENT_CODES or _is_timeout(exc)
            if _is_quota_exhausted(exc) and (code == 429 or code is None):
                if attempt >= max_attempts or "daily" in str(exc).lower() or "rpd" in str(exc).lower():
                    raise QuotaExhaustedError(
                        "Gemini free-tier quota is exhausted. Stop for today and try after "
                        "the daily reset (RPD resets at midnight Pacific). Details: "
                        f"{exc}"
                    ) from exc
            if not transient or attempt >= max_attempts:
                if code == 429:
                    raise QuotaExhaustedError(
                        "Gemini returned 429 after retries. Treat this as quota/rate-limit "
                        f"exhaustion, not a crash loop. Details: {exc}"
                    ) from exc
                raise
            delay = (2 ** (attempt - 1)) + rng.random()
            logger.warning(
                "Transient Gemini error (attempt %s/%s, code=%s): %s; sleeping %.1fs",
                attempt,
                max_attempts,
                code,
                exc,
                delay,
            )
            sleep(delay)
    raise GenerationError(f"Retries exhausted: {last_exc}")


class GeminiGenerator:
    def __init__(
        self,
        settings: Settings,
        *,
        client: Any | None = None,
        sleep: SleepFn = time.sleep,
    ) -> None:
        self.settings = settings
        self.sleep = sleep
        self._client = client

    def _client_or_create(self) -> Any:
        if self._client is not None:
            return self._client
        from google import genai  # Imported lazily so tests need no SDK call.

        self._client = genai.Client(api_key=self.settings.gemini_api_key)
        return self._client

    def generate(
        self,
        *,
        category: str,
        style: str,
        length_name: str,
        length: LengthSpec,
        previous_titles: list[str],
    ) -> GeneratedPost:
        prompt = build_prompt(
            subreddit=self.settings.subreddit,
            topics=self.settings.topics,
            category=category,
            style=style,
            length_name=length_name,
            length=length,
            previous_titles=previous_titles,
        )
        raw = retry_with_backoff(lambda: self._call_model(prompt), sleep=self.sleep)
        parsed = parse_gemini_response(raw, fallback_category=category)
        title = parsed["title"]
        body = parsed["body"]
        used_category = parsed.get("category") or category
        return GeneratedPost(
            title=title,
            body=body,
            category=used_category,
            content_hash=content_hash(title, body),
        )

    def _call_model(self, prompt: str) -> str:
        client = self._client_or_create()
        try:
            from google.genai import types
        except ImportError:  # pragma: no cover - older SDK fallback
            types = None  # type: ignore[assignment]

        kwargs: dict[str, Any] = {"model": self.settings.gemini_model, "contents": prompt}
        if types is not None:
            try:
                kwargs["config"] = types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=POST_JSON_SCHEMA,
                    temperature=0.9,
                )
            except (TypeError, ValueError):
                kwargs["config"] = {
                    "response_mime_type": "application/json",
                    "response_schema": POST_JSON_SCHEMA,
                    "temperature": 0.9,
                }
        response = client.models.generate_content(**kwargs)
        text = getattr(response, "text", None)
        if not text:
            raise GenerationError("Gemini response had no text")
        return text


class FakeGenerator:
    """Deterministic generator for tests and local runs without an API key."""

    def __init__(self, title: str | None = None, body: str | None = None) -> None:
        self.title = title or "What's a small habit that actually improved your week?"
        self.body = body or (
            "I have been thinking about tiny changes that compound over time — "
            "not dramatic life overhauls, just ordinary tweaks that make a week "
            "feel more manageable. I am not claiming a study or a personal "
            "miracle, just looking for patterns other people have noticed in "
            "their own routines without turning it into a productivity sermon. "
            "Sleep, walking, a shutdown ritual, or something much smaller are "
            "all fair game. What is one small habit you kept because it "
            "genuinely helped, and why do you think it stuck?"
        )

    def generate(self, **kwargs: Any) -> GeneratedPost:
        category = str(kwargs.get("category") or "discussion")
        title = self.title
        body = self.body
        return GeneratedPost(
            title=title,
            body=body,
            category=category,
            content_hash=content_hash(title, body),
        )
