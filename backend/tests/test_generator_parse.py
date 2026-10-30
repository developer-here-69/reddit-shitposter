from __future__ import annotations

import pytest

from src.exceptions import GenerationError, QuotaExhaustedError
from src.generator import parse_gemini_response, retry_with_backoff


def test_parse_valid_json() -> None:
    raw = '{"title": "Hello community", "body": "This is the body text.", "category": "discussion"}'
    parsed = parse_gemini_response(raw)
    assert parsed["title"] == "Hello community"
    assert parsed["body"] == "This is the body text."
    assert parsed["category"] == "discussion"


def test_parse_fenced_json() -> None:
    raw = """Sure, here you go:
```json
{"title": "Fenced title", "body": "Fenced body"}
```
"""
    parsed = parse_gemini_response(raw, fallback_category="question")
    assert parsed["title"] == "Fenced title"
    assert parsed["body"] == "Fenced body"
    assert parsed["category"] == "question"


def test_parse_malformed_json_salvage() -> None:
    raw = '{"title": "Almost valid", "body": "Still usable body", "category": }'
    parsed = parse_gemini_response(raw)
    assert parsed["title"] == "Almost valid"
    assert "usable" in parsed["body"]


def test_parse_empty_raises() -> None:
    with pytest.raises(GenerationError):
        parse_gemini_response("   ")


class _Fake429(Exception):
    def __init__(self, msg: str) -> None:
        super().__init__(msg)
        self.code = 429


def test_retry_backoff_then_success() -> None:
    sleeps: list[float] = []
    calls = {"n": 0}

    def flaky() -> str:
        calls["n"] += 1
        if calls["n"] < 3:
            err = RuntimeError("temporary")
            err.code = 503  # type: ignore[attr-defined]
            raise err
        return "ok"

    result = retry_with_backoff(flaky, sleep=sleeps.append, rng=__import__("random").Random(0))
    assert result == "ok"
    assert len(sleeps) == 2
    assert sleeps[0] < sleeps[1]


def test_retry_quota_exhausted() -> None:
    def always_quota() -> None:
        raise _Fake429("RESOURCE_EXHAUSTED: daily quota / RPD exceeded")

    with pytest.raises(QuotaExhaustedError):
        retry_with_backoff(always_quota, sleep=lambda _: None)
