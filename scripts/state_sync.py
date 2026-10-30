#!/usr/bin/env python3
"""Checkout and push the orphan `state` branch (SQLite DB + drafts). Never writes secrets."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATE_DIR = Path(os.environ.get("STATE_DIR") or ROOT / "state")
BRANCH = os.environ.get("STATE_BRANCH", "state")
BOT_NAME = "github-actions[bot]"
BOT_EMAIL = "41898282+github-actions[bot]@users.noreply.github.com"


def run(cmd: list[str], cwd: Path | None = None, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, cwd=cwd or ROOT, check=check, text=True, capture_output=True)


def git_config(cwd: Path) -> None:
    run(["git", "config", "user.name", BOT_NAME], cwd=cwd)
    run(["git", "config", "user.email", BOT_EMAIL], cwd=cwd)


def remote_url() -> str:
    token = os.environ.get("GITHUB_TOKEN", "")
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    if token and repo:
        return f"https://x-access-token:{token}@github.com/{repo}.git"
    return "origin"


def cmd_checkout() -> int:
    token = os.environ.get("GITHUB_TOKEN", "")
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    if not repo:
        print("GITHUB_REPOSITORY unset; using empty local state dir")
        STATE_DIR.mkdir(parents=True, exist_ok=True)
        (STATE_DIR / "data").mkdir(exist_ok=True)
        (STATE_DIR / "drafts").mkdir(exist_ok=True)
        return 0

    if STATE_DIR.exists() and not (STATE_DIR / ".git").exists():
        # git clone can use an empty directory; remove leftover files if any.
        for child in STATE_DIR.iterdir():
            if child.is_file():
                child.unlink()
    STATE_DIR.mkdir(parents=True, exist_ok=True)

    url = f"https://x-access-token:{token}@github.com/{repo}.git"
    clone = subprocess.run(
        ["git", "clone", "--depth", "1", "--branch", BRANCH, url, str(STATE_DIR)],
        text=True,
        capture_output=True,
    )
    if clone.returncode == 0:
        print(f"Checked out {BRANCH} into {STATE_DIR}")
        return 0

    print(f"{BRANCH} branch missing; starting empty state directory")
    # clone may have created a partial dir
    (STATE_DIR / "data").mkdir(parents=True, exist_ok=True)
    (STATE_DIR / "drafts").mkdir(parents=True, exist_ok=True)
    readme = STATE_DIR / "README.md"
    if not readme.exists():
        readme.write_text(
            "Automation state (SQLite + drafts). No secrets belong here.\n",
            encoding="utf-8",
        )
    return 0


def _ensure_git_repo() -> None:
    git_dir = STATE_DIR / ".git"
    if git_dir.exists():
        git_config(STATE_DIR)
        return
    run(["git", "init", "-b", BRANCH], cwd=STATE_DIR)
    git_config(STATE_DIR)
    url = remote_url()
    run(["git", "remote", "add", "origin", url], cwd=STATE_DIR, check=False)


def cmd_push() -> int:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    (STATE_DIR / "data").mkdir(exist_ok=True)
    (STATE_DIR / "drafts").mkdir(exist_ok=True)
    _ensure_git_repo()

    # Guard: never add env files
    for forbidden in STATE_DIR.rglob(".env"):
        print(f"Refusing to push; found {forbidden}", file=sys.stderr)
        return 1

    run(["git", "add", "data", "drafts", "README.md"], cwd=STATE_DIR, check=False)
    status = run(["git", "status", "--porcelain"], cwd=STATE_DIR)
    if not status.stdout.strip():
        print("No state changes to push")
        return 0

    commit = run(
        ["git", "commit", "-m", "chore: update automation state"],
        cwd=STATE_DIR,
        check=False,
    )
    if commit.returncode != 0 and "nothing to commit" not in (commit.stdout + commit.stderr):
        print(commit.stdout + commit.stderr)
        # still try push in case commit already existed

    url = remote_url()
    for attempt in range(1, 6):
        push = run(["git", "push", url, f"HEAD:{BRANCH}"], cwd=STATE_DIR, check=False)
        if push.returncode == 0:
            print(f"Pushed {BRANCH} (attempt {attempt})")
            return 0
        print(f"Push conflict (attempt {attempt}): {push.stderr}")
        fetch = run(["git", "fetch", url, BRANCH], cwd=STATE_DIR, check=False)
        if fetch.returncode == 0:
            rebase = run(["git", "pull", "--rebase", url, BRANCH], cwd=STATE_DIR, check=False)
            if rebase.returncode != 0:
                print(rebase.stderr)
                run(["git", "rebase", "--abort"], cwd=STATE_DIR, check=False)
        if attempt == 5:
            print("Giving up on state push", file=sys.stderr)
            print(push.stderr, file=sys.stderr)
            return 1
    return 1


def main(argv: list[str]) -> int:
    action = argv[1] if len(argv) > 1 else "help"
    if action == "checkout":
        return cmd_checkout()
    if action == "push":
        return cmd_push()
    print("Usage: state_sync.py [checkout|push]")
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
