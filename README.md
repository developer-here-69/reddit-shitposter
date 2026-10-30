# reddit-shitposter

### Free Reddit AI Posting Automation (Python + Gemini + PRAW + GitHub Actions)

Python + Gemini (Google AI Studio free tier) + PRAW + SQLite + GitHub Actions.

This tool drafts discussion posts for **one subreddit you own**, using **one Reddit account you own**. It does not rotate accounts, vote, fake engagement, spam, or bypass rate limits.

**Three modes** (env var `MODE`):

| Mode | Contacts Reddit? | What it does |
| --- | --- | --- |
| `dry_run` (default) | No | Generates a draft, prints it, saves it in SQLite as `draft` |
| `manual` | No | Same generation, plus writes `drafts/*.md` so you can copy-paste into Reddit |
| `publish` | Yes, via PRAW | Only if **all three** are set: `MODE=publish`, `POSTING_ENABLED=true`, `DRY_RUN=false` |

If Reddit denies API access, keep using `dry_run` and `manual`. Those paths never need Reddit credentials.

## Reality check: Reddit API approval

Reddit’s [Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy) requires **explicit approval** before new API/OAuth access. Creating a “script” app at [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps) is not enough by itself. Approval is not guaranteed.

- If approved: you may set `MODE=publish` after the three safety flags.
- If denied or still pending: use `MODE=manual` and paste drafts yourself.

Request access from Reddit’s developer/help flows ([developers.reddit.com](https://developers.reddit.com/) and [Reddit Help](https://support.reddithelp.com/hc/en-us/requests/new)). Describe a **single-account, single-subreddit, low-volume, non-spam** use case. Do not ask for vote or multi-account automation.

## Cost: $0

- Gemini: Google AI Studio **free tier**, no billing account required. Tokens are free; **RPM / TPM / RPD** still apply. Daily request quotas reset at **midnight Pacific**. Check your live limits in AI Studio → Rate limits.
- GitHub Actions: **public** repos get free minutes. This project is meant to stay public.
- SQLite: local file, no hosted database.

## What you need

- Python **3.12+**
- Git
- A free Gemini API key
- (Optional, publish only) Reddit script-app credentials **and** API approval

---

## 1. Install Python 3.12+ and Git

- Python: https://www.python.org/downloads/ (check “Add python.exe to PATH” on Windows)
- Git: https://git-scm.com/downloads

Confirm:

**PowerShell**

```powershell
python --version
git --version
```

**Git Bash**

```bash
python --version
git --version
```

---

## 2. Get a free Gemini API key (no billing)

1. Open [Google AI Studio](https://aistudio.google.com/apikey).
2. Create an API key. **Do not** enable billing unless you choose to later.
3. Model names change. This repo defaults `GEMINI_MODEL` to `gemini-2.5-flash-lite` (documented free-tier Flash-Lite). If that model 404s for your project, pick a free model from AI Studio and set `GEMINI_MODEL` to that exact id (for example another Flash / Flash-Lite id listed in the [Gemini API docs](https://ai.google.dev/gemini-api/docs)).

Free-tier rate limits are per project (RPM, TPM, RPD). If you hit **429**, the job exits cleanly instead of looping.

---

## 3. Reddit script app (only for `publish`)

1. Log into the **one** account you will post with.
2. Open https://www.reddit.com/prefs/apps → “create another app…”
3. Type: **script**. Redirect URI: `http://localhost:8080` (required by Reddit even for script apps).
4. Copy the client id (under “personal use script”) and the secret.
5. **Request API access** under the Responsible Builder Policy. Until that is approved, PRAW calls will fail with 401/403.
6. User agent format Reddit expects: `platform:app-name:version (by /u/YourUsername)`

If access is denied: ignore Reddit env vars and use `MODE=manual`.

PRAW script (password) flow uses `client_id`, `client_secret`, `username`, `password`, `user_agent`. The username/password must be the same account that owns the script app. See [PRAW authentication](https://praw.readthedocs.io/en/stable/getting_started/authentication.html).

---

## 4. Create `.env` (never commit it)

**PowerShell**

```powershell
cd d:\reddit-autoshit
Copy-Item .env.example .env
notepad .env
```

**Git Bash**

```bash
cd /d/reddit-autoshit
cp .env.example .env
nano .env   # or notepad .env
```

Fill `GEMINI_API_KEY` and `SUBREDDIT`. Leave `MODE=dry_run`, `POSTING_ENABLED=false`, `DRY_RUN=true` until you are ready.

Also edit `config/topics.yaml` (description, rules, categories, optional flair, optional AI-disclosure footer).

---

## 5. Virtualenv, install, tests

**PowerShell**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
pytest
```

If execution policy blocks activation:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

**Git Bash**

```bash
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash
# source .venv/bin/activate     # macOS / Linux
python -m pip install --upgrade pip
pip install -r requirements.txt
pytest
```

Tests are offline. They mock Gemini and Reddit.

---

## 6. Run locally

Dry-run with the real Gemini key:

**PowerShell / Git Bash**

```powershell
python -m src.main
```

Dry-run **without** a key (built-in fake generator):

```powershell
$env:FAKE_GENERATOR="true"    # PowerShell
python -m src.main --fake
```

```bash
export FAKE_GENERATOR=true    # Git Bash
python -m src.main --fake
```

If `GEMINI_API_KEY` is missing and you did not pass `--fake`, the process prints a clear error and exits. It does not crash-loop.

Manual mode (writes `drafts/*.md`):

```powershell
$env:MODE="manual"
python -m src.main --fake
```

GitHub Actions is the scheduler. There is no local APScheduler.

---

## 7. Create a PUBLIC GitHub repo and push

Public repos get **free** GitHub Actions minutes. Private repos consume a limited free quota.

```powershell
git init
git add .
git commit -m "Add Reddit AI automation"
git branch -M main
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

Do **not** add `.env`. Confirm `git status` does not list it.

---

## 8. Actions secrets and variables

Repo → **Settings** → **Secrets and variables** → **Actions**.

**Secrets** (exact names):

- `GEMINI_API_KEY`
- `REDDIT_CLIENT_ID` (publish only)
- `REDDIT_CLIENT_SECRET` (publish only)
- `REDDIT_USERNAME` (publish only)
- `REDDIT_PASSWORD` (publish only)
- `REDDIT_USER_AGENT` (publish only)

**Variables** (non-secret):

- `SUBREDDIT` — without `r/`
- `MODE` — start with `dry_run`
- `POSTING_ENABLED` — `false`
- `DRY_RUN` — `true`
- `GEMINI_MODEL` — optional; defaults to `gemini-2.5-flash-lite`
- `MAX_POSTS_PER_DAY` — optional; default `3`

---

## 9. Enable the workflow and run it by hand first

1. **Actions** tab → enable workflows if GitHub asks.
2. Open **Reddit posting** → **Run workflow**.
3. First run: mode `dry_run`. Confirm tests pass, a draft is printed, and a `state` branch appears with `data/automation.db`.
4. Second run: mode `manual`. Open the `state` branch → `drafts/` and copy a post into Reddit yourself.
5. Only after Reddit API approval: set variables `MODE=publish`, `POSTING_ENABLED=true`, `DRY_RUN=false`, add Reddit secrets, then run workflow_dispatch with `publish` once.

Scheduled cron will not publish unless those three flags are already set in variables (the dispatch input can set `MODE`, but `POSTING_ENABLED` and `DRY_RUN` still come from variables). That is intentional.

---

## 10. Schedule (IST → UTC)

GitHub cron is UTC. IST is UTC+5:30 and does not use DST.

| IST | UTC | cron |
| --- | --- | --- |
| 9:00 AM | 03:30 | `30 3 * * *` |
| 3:00 PM | 09:30 | `30 9 * * *` |
| 9:00 PM | 15:30 | `30 15 * * *` |

Edit `.github/workflows/reddit-posting.yml` to change times. Scheduled jobs can start **several minutes late**. GitHub does not guarantee exact minute timing.

---

## 11. Monitor runs and the `state` branch

- Failed jobs stay red. Open the log and the job summary.
- Persistence lives on an orphan branch named `state` (SQLite + `drafts/`). Not Actions cache, not artifacts.
- After **claim-before-publish**, the workflow pushes `state` *before* calling Reddit so a retry cannot double-post. Rows stuck in `claimed` become `needs_review`.
- Commits on `state` use `github-actions[bot]`.

---

## 12. Troubleshooting

| Symptom | What to do |
| --- | --- |
| Reddit **401 / 403** | API access not approved, wrong script credentials, user agent, or account mismatch. Stay on `manual`. |
| Gemini **429** | Free-tier RPM or daily RPD. The job exits cleanly. Wait; RPD resets midnight Pacific. Switch `GEMINI_MODEL` to a Flash-Lite id if needed. |
| Push conflicts on `state` | The script rebases and retries. If it still fails, check the Actions log; the next run fetches `state` again. |
| Stuck `claimed` / `needs_review` | Open Reddit and see if the post exists. On the `state` branch DB, leave it as `needs_review` until you know. The app **will not** post that row again. |
| Schedule stopped | Public repos auto-disable scheduled workflows after **60 days without repository activity**. Bot commits on `state` often **do not** count. Workaround: push a tiny commit to `main` (or use the UI **Actions → Enable workflow**), or run workflow_dispatch periodically. |
| Duplicate false positive | Lower `SIMILARITY_THRESHOLD` (for example `0.92`) or change the topic angle in `topics.yaml`. |
| Tests fail in Actions | Fix tests locally with `pytest`. The workflow never posts if tests fail. |

---

## Safety behavior

- Default is dry-run. Publish requires three flags **and** Reddit credentials.
- Daily cap: `MAX_POSTS_PER_DAY` (UTC date, default 3).
- Duplicate detection: exact hash, normalized title, and similarity (`difflib`).
- Gemini retries: up to 3 attempts, exponential backoff + jitter, then stop. Quota exhaustion is not a crash loop.
- Reddit submit: at most two attempts, bounded `ratelimit_seconds` (default 30, capped at 60).
- Logs redact API keys, client secrets, and passwords.
- The `state` branch must never contain `.env` or secrets.

---

## Project layout

```
src/config.py          # env + topics.yaml
src/generator.py       # Gemini structured JSON + fallback parser
src/validator.py       # title/body rules + optional AI footer
src/database.py        # SQLite
src/reddit_client.py   # PRAW (publish only)
src/publisher.py       # claim-before-publish
src/main.py            # python -m src.main
config/topics.yaml
tests/
.github/workflows/reddit-posting.yml
scripts/state_sync.py  # also scripts/state_sync.sh
```

Official libraries: [`google-genai`](https://googleapis.github.io/python-genai/) (not the deprecated `google-generativeai`) and [PRAW](https://praw.readthedocs.io/).
