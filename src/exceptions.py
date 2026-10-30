"""Application-specific errors."""


class ConfigError(ValueError):
    """Invalid or incomplete configuration."""


class QuotaExhaustedError(RuntimeError):
    """Gemini free-tier quota is exhausted; stop cleanly."""


class GenerationError(RuntimeError):
    """Gemini failed to produce a usable post."""


class ValidationError(ValueError):
    """Generated content failed local checks."""


class DuplicateError(ValueError):
    """Post is too similar to something already stored."""


class DailyCapError(RuntimeError):
    """MAX_POSTS_PER_DAY would be exceeded."""


class PublishSafetyError(RuntimeError):
    """Publish was requested without all three safety flags."""


class StuckClaimError(RuntimeError):
    """A previous run left a row in claimed; do not post again."""
