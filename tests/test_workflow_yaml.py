from __future__ import annotations

from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
WF = ROOT / ".github" / "workflows" / "reddit-posting.yml"


def test_workflow_parses_and_has_safety_keys() -> None:
    data = yaml.safe_load(WF.read_text(encoding="utf-8"))
    assert data["name"]
    # PyYAML parses the YAML key "on" as boolean True
    on_key = True if True in data else "on"
    crons = [item["cron"] for item in data[on_key]["schedule"]]
    assert "30 3 * * *" in crons
    assert "30 9 * * *" in crons
    assert "30 15 * * *" in crons
    assert data["concurrency"]["group"] == "reddit-posting"
    assert data["concurrency"]["cancel-in-progress"] is False
    assert data["permissions"] == {"contents": "write"}
    job = data["jobs"]["post"]
    assert job["timeout-minutes"] == 20
    steps = job["steps"]
    names = [s.get("name") for s in steps]
    assert "Run tests (must pass before any posting work)" in names
    push = next(s for s in steps if s.get("name", "").startswith("Push state"))
    assert push.get("if") == "always()"
    text = WF.read_text(encoding="utf-8")
    assert "secrets.GEMINI_API_KEY" in text
    assert "IST" in text
