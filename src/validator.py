"""Local content checks before anything is saved or posted."""

from __future__ import annotations

import hashlib
import re
import unicodedata
from dataclasses import dataclass

from src.config import LengthSpec, TopicConfig
from src.exceptions import ValidationError

TITLE_MAX = 300
PLACEHOLDER_RE = re.compile(
    r"(\[[A-Z][A-Za-z0-9 _-]{2,}\]|\{[A-Z][A-Z0-9_]+\})|<insert\s+[^>]+>|YOUR_NAME|TODO:",
    re.IGNORECASE,
)
URL_RE = re.compile(r"https?://|www\.", re.IGNORECASE)
PUNCT_RUN_RE = re.compile(r"[!?]{4,}|[.]{4,}")
# Broad emoji / pictograph ranges (enough to catch spammy titles).
EMOJI_RE = re.compile(
    "["
    "\U0001f300-\U0001faff"
    "\U00002700-\U000027bf"
    "\U0001f900-\U0001f9ff"
    "\U00002600-\U000026ff"
    "]+",
)
PUNCT_STRIP_RE = re.compile(r"[^\w\s]", re.UNICODE)
WHITESPACE_RE = re.compile(r"\s+")


def normalize_title(title: str) -> str:
    lowered = unicodedata.normalize("NFKC", title).lower()
    stripped = PUNCT_STRIP_RE.sub(" ", lowered)
    return WHITESPACE_RE.sub(" ", stripped).strip()


def normalize_body(body: str) -> str:
    return WHITESPACE_RE.sub(" ", body).strip()


def content_hash(title: str, body: str) -> str:
    payload = f"{normalize_title(title)}\n{normalize_body(body)}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


@dataclass
class ValidationResult:
    ok: bool
    errors: list[str]
    title: str
    body: str

    def raise_if_invalid(self) -> None:
        if not self.ok:
            raise ValidationError("; ".join(self.errors))


def _letters(text: str) -> str:
    return "".join(ch for ch in text if ch.isalpha())


def validate_title(title: str) -> list[str]:
    errors: list[str] = []
    cleaned = title.strip()
    if not cleaned:
        errors.append("Title is empty")
        return errors
    if len(cleaned) > TITLE_MAX:
        errors.append(f"Title exceeds Reddit's {TITLE_MAX}-character limit ({len(cleaned)})")
    letters = _letters(cleaned)
    if len(letters) >= 8 and letters.isupper():
        errors.append("Title looks like ALL-CAPS spam")
    if PUNCT_RUN_RE.search(cleaned):
        errors.append("Title has excessive punctuation")
    if len(EMOJI_RE.findall(cleaned)) > 3:
        errors.append("Title has too many emoji")
    if PLACEHOLDER_RE.search(cleaned):
        errors.append("Title contains a leftover placeholder")
    return errors


def validate_body(body: str, topics: TopicConfig, length: LengthSpec) -> list[str]:
    errors: list[str] = []
    cleaned = body.strip()
    if len(cleaned) < length.min_chars:
        errors.append(f"Body is too short ({len(cleaned)} < {length.min_chars})")
    if len(cleaned) > length.max_chars:
        errors.append(f"Body is too long ({len(cleaned)} > {length.max_chars})")
    if not topics.allow_urls and URL_RE.search(cleaned):
        errors.append("Body contains a URL, but allow_urls is false")
    if PLACEHOLDER_RE.search(cleaned):
        errors.append("Body contains a leftover placeholder")
    lowered = cleaned.lower()
    for phrase in topics.banned_phrases:
        if phrase and phrase.lower() in lowered:
            errors.append(f"Body contains banned phrase: {phrase!r}")
    return errors


def append_disclosure(body: str, disclosure: str) -> str:
    text = disclosure.strip()
    if not text:
        return body.rstrip()
    if text in body:
        return body.rstrip()
    return body.rstrip() + "\n\n" + text


def validate_post(
    title: str,
    body: str,
    topics: TopicConfig,
    length: LengthSpec,
    *,
    apply_disclosure: bool = True,
) -> ValidationResult:
    errors = validate_title(title) + validate_body(body, topics, length)
    final_body = append_disclosure(body, topics.ai_disclosure) if apply_disclosure else body
    return ValidationResult(ok=not errors, errors=errors, title=title.strip(), body=final_body)
