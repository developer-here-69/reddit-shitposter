from __future__ import annotations

import logging

from src.logging_setup import RedactingFilter


def test_redacting_filter() -> None:
    record = logging.LogRecord(
        name="t",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="token=sekrit1234 user=alice",
        args=(),
        exc_info=None,
    )
    filt = RedactingFilter(["sekrit1234"])
    assert filt.filter(record)
    assert "***REDACTED***" in record.msg
    assert "sekrit1234" not in record.msg
