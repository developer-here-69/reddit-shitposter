# 🚀 ArreSuno Reddit Automation System

> **Autonomous Multi-Account Hinglish Reddit Discussion Generator & Human-like Poster for [r/ArreSuno](https://www.reddit.com/r/ArreSuno/)**

Featuring a modern **Next.js 16 Dark Dashboard** (Framer Motion drag-and-drop queue, real-time Gemini generation, live post editing), **Antigravity-Style Human Browser Automation** (Bezier mouse curves, human typing cadence), **Real Google Chrome Auth**, and **24/7 GitHub Actions Cloud Posting** (runs on schedule even with your laptop turned off).

---

## 📖 Complete Documentation
For full architectural diagrams, deep-dive explanations, anti-ban guidelines, and session management, see:
👉 **[PROJECT_DOCUMENTATION.md](file:///d:/reddit-autoshit/PROJECT_DOCUMENTATION.md)**

---

## ⚡ What Makes This Special?

1. **Reddit Dark Dashboard (`frontend/`)**:
   - Curated for `r/ArreSuno` with authentic Snoo branding and chai tapri banner.
   - Smooth mouse drag-and-drop reordering & 1-click randomized queue shuffle.
   - 1-click Hinglish discussion generation powered by **Gemini 2.5 Flash** across cultural categories (*Relatable Life, Chai Tapri Debates, Harmless Confessions, Office Ka Kissa, 2000s Nostalgia*).
   - In-app post editor with live Reddit permalink archives.

2. **Multi-Account Rotation (`u/mere_se_nhi_hota`, `u/chai_tapri_vibes`)**:
   - Cycles across accounts with configurable daily limits (e.g. 2 posts/day per account).
   - Prevents spam flags and keeps community engagement organic.

3. **Real Google Chrome Authentication**:
   - Launches genuine desktop Google Chrome with isolated user profile folders.
   - Supports Google OAuth ("Continue with Google"), 2FA, passwords, and passkeys natively.
   - Zero terminal popups — runs windowless via `pythonw.exe`.

4. **Antigravity-Style Human Browser Automation**:
   - Cubic bezier curve mouse glide with natural velocity deceleration and overshoot.
   - Human keystroke intervals (40ms – 105ms) with sentence micro-pauses.
   - Inertial smooth scrolling and glowing visual orange cursor overlay.

5. **24/7 Cloud Automation (Laptop Powered Off)**:
   - Automated GitHub Actions workflow (`.github/workflows/reddit-posting.yml`).
   - Runs 3x daily (9:00 AM, 3:00 PM, 9:00 PM IST) completely in the cloud.

---

## 🛠 Quickstart Guide

### 1. Run the Dark Dashboard Locally
```powershell
# In terminal 1 (Frontend)
cd frontend
npm install
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

### 2. Run the Backend & Test Suite
```powershell
# In terminal 2 (Backend)
cd backend
..\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pytest -v
```
*(All 42 unit tests pass offline)*

### 3. Log In with Your Reddit Account
1. On your dashboard at `http://localhost:3000`, look at the **Poster Accounts Rotation** widget in the right sidebar.
2. If using your main browser where you are already logged into Reddit (`u/mere_se_nhi_hota`), simply click:
   👉 **`Auth Needed (Click if done ✓)`** → turns green: **`Logged In ✓`**.
3. If setting up an isolated profile, click **`Open Real Chrome 🌐`** to log in natively.

### 4. Post to r/ArreSuno
- Click **`Post via Browser Agent 🖱️`** to watch the Playwright agent type, scroll, and post in real-time.
- Or click **`Post (API)`** for direct background posting.

---

## ☁️ Running 24/7 with Laptop Turned Off

1. Add your repository secrets in GitHub (**Settings → Secrets and variables → Actions**):
   - `GEMINI_API_KEY`: Free key from [Google AI Studio](https://aistudio.google.com/apikey)
   - `REDDIT_USERNAME`: `mere_se_nhi_hota`
   - `REDDIT_PASSWORD`: Your Reddit account password
   - `REDDIT_CLIENT_ID`: Script app ID from [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
   - `REDDIT_CLIENT_SECRET`: Script app secret
   - `REDDIT_USER_AGENT`: `windows:arresuno-poster:v1.0.0 (by /u/mere_se_nhi_hota)`
2. Set repository variables:
   - `SUBREDDIT`: `ArreSuno`
   - `MODE`: `publish`
   - `POSTING_ENABLED`: `true`
   - `DRY_RUN`: `false`
3. The workflow runs automatically at **9:00 AM, 3:00 PM, and 9:00 PM IST** every day!

---

## 📁 Repository Overview

```
reddit-shitposter/
├── .github/workflows/reddit-posting.yml   # 3x daily IST posting cron
├── backend/
│   ├── src/
│   │   ├── browser_poster.py              # Playwright human agent & login
│   │   ├── human_motion.py                # Bezier curves & natural typing
│   │   ├── generator.py                   # Gemini Hinglish generation
│   │   ├── publisher.py                   # PRAW Reddit publisher
│   │   └── database.py                    # SQLite deduplication state
│   └── tests/                             # 42 offline unit tests
├── frontend/                              # Next.js 16 Dark Dashboard
│   ├── app/                               # App router & API routes
│   └── components/                        # UI components & Framer Motion
├── PROJECT_DOCUMENTATION.md               # Deep architectural documentation
└── README.md                              # This quickstart guide
```

---

*Built with ❤️ for r/ArreSuno Community Growth — 2026*
