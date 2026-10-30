from __future__ import annotations

from src.config import LengthSpec
from src.validator import content_hash, normalize_title, validate_post


def test_title_and_body_ok(topics) -> None:
    title = "What helped you keep a new routine without burning out?"
    body = (
        "I keep seeing people talk about starting over every Monday. I am not "
        "sharing a personal success story or a statistic, just wondering how "
        "others decide a habit is worth keeping when the novelty wears off. "
        "What actually helped you stick with something small?"
    )
    result = validate_post(title, body, topics, LengthSpec(180, 700))
    assert result.ok, result.errors
    assert "Drafted with AI" in result.body


def test_title_all_caps_rejected(topics) -> None:
    result = validate_post(
        "THIS IS A SPAMMY TITLE YOU MUST READ",
        "x" * 200,
        topics,
        LengthSpec(10, 700),
        apply_disclosure=False,
    )
    assert not result.ok
    assert any("ALL-CAPS" in e for e in result.errors)


def test_title_too_long(topics) -> None:
    result = validate_post("A" * 301, "x" * 200, topics, LengthSpec(10, 500), apply_disclosure=False)
    assert any("300" in e for e in result.errors)


def test_urls_blocked(topics) -> None:
    body = "Please visit https://example.com for more " + ("words " * 40)
    result = validate_post("A reasonable title here", body, topics, LengthSpec(10, 5000), apply_disclosure=False)
    assert any("URL" in e for e in result.errors)


def test_banned_phrase_and_placeholder(topics) -> None:
    body = "Use my code for guaranteed results [Your Name] " + ("text " * 40)
    result = validate_post("A reasonable title here", body, topics, LengthSpec(10, 5000), apply_disclosure=False)
    joined = " ".join(result.errors)
    assert "banned" in joined
    assert "placeholder" in joined


def test_normalize_and_hash_stable() -> None:
    a = normalize_title("Hello, World!!!")
    b = normalize_title("  hello world  ")
    assert a == b
    assert content_hash("Hello, World!!!", "Body") == content_hash("hello world", "Body")
