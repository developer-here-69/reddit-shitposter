"""Logging with secret redaction so credentials never hit logs."""

from __future__ import annotations

import logging
import sys
from collections.abc import Iterable


SECRET_ENV_NAMES = (
    "GEMINI_API_KEY",
    "REDDIT_CLIENT_ID",
    "REDDIT_CLIENT_SECRET",
    "REDDIT_PASSWORD",
    "REDDIT_USERNAME",
)


class RedactingFilter(logging.Filter):
    """Replace known secret values with ***REDACTED*** in log records."""

    def __init__(self, secrets: Iterable[str]) -> None:
        super().__init__()
        self._secrets = [s for s in secrets if s and len(s) >= 4]

    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = self._redact(str(record.msg))
        if record.args:
            if isinstance(record.args, dict):
                record.args = {k: self._redact(str(v)) for k, v in record.args.items()}
            else:
                record.args = tuple(self._redact(str(a)) for a in record.args)
        return True

    def _redact(self, text: str) -> str:
        for secret in self._secrets:
            text = text.replace(secret, "***REDACTED***")
        return text


def collect_secrets(env: dict[str, str]) -> list[str]:
    values: list[str] = []
    for name in SECRET_ENV_NAMES:
        value = env.get(name, "").strip()
        if value:
            values.append(value)
    return values


def setup_logging(secrets: Iterable[str], level: int = logging.INFO) -> logging.Logger:
    logger = logging.getLogger("reddit_ai")
    logger.setLevel(level)
    logger.handlers.clear()
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    handler.addFilter(RedactingFilter(secrets))
    logger.addHandler(handler)
    logger.propagate = False
    return logger
