"""Fail if the repo looks like it contains real secrets."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

SKIP_DIRS = {
    ".git",
    ".venv",
    "venv",
    "__pycache__",
    ".pytest_cache",
    "node_modules",
    "state",
    "data",
}

# Real-looking values, not YOUR_ placeholders.
PATTERNS = [
    re.compile(r"AIza[0-9A-Za-z\-_]{20,}"),
    re.compile(r"-----BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY-----"),
    re.compile(r"ghp_[0-9A-Za-z]{20,}"),
    re.compile(r"github_pat_[0-9A-Za-z_]{20,}"),
]


def test_no_dotenv_committed() -> None:
    import os

    # In CI/GitHub Actions, .env must never exist in the repo checkout.
    # Locally, verify that .gitignore properly excludes .env so it cannot be committed.
    if os.getenv("CI") or os.getenv("GITHUB_ACTIONS"):
        assert not (ROOT / ".env").exists() or (ROOT / ".env").stat().st_size == 0
    else:
        gitignore = (ROOT / ".gitignore").read_text(encoding="utf-8")
        assert ".env" in gitignore


def test_repo_has_no_secret_patterns() -> None:
    hits: list[str] = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if path.name == ".env" or any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".gif", ".webp", ".pyc", ".db"}:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        if "YOUR_" in text and path.name in {".env.example", "README.md"}:
            pass
        for pattern in PATTERNS:
            for match in pattern.findall(text):
                snippet = match if isinstance(match, str) else match[0]
                hits.append(f"{path.relative_to(ROOT)}: {snippet[:24]}...")
    assert hits == [], "Possible secrets found:\n" + "\n".join(hits)
