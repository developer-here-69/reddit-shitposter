# 🦊 ArreSuno Poster — Desktop Application

> **Personal Desktop Reddit Discussion Manager & Human-like Poster for [r/ArreSuno](https://old.reddit.com/r/ArreSuno/)**  
> Built with **Electron 32 + TypeScript + React 19 (Vite) + Tailwind CSS + Framer Motion**.

ArreSuno Poster is a dedicated desktop tool for curating, managing, and posting discussions to **r/ArreSuno** using your own single Reddit account (`u/mere_se_nhi_hota`). It interacts directly through an **embedded Chromium browser view (`WebContentsView`)** targeting Old Reddit (`old.reddit.com`) with **NO Reddit API, NO PRAW, and NO OAuth**.

---

## 📸 Key Features & Architecture

### 1. Split-View UX
- **Left Panel (~35%)**:
  - **Sortable Post Queue**: Drag-and-drop reordering with `@dnd-kit`, randomized queue shuffle, post status badges (`draft`, `approved`, `posted`, `failed`), and post metadata/flair editor.
  - **Gemini Hinglish Generator**: Generates engaging Hindi-English discussion topics across 5 categories (*Relatable Life, Chai Tapri Debates, Office Ka Kissa, 2000s Nostalgia, Harmless Confessions*). API key encrypted with Electron `safeStorage` (DPAPI).
  - **Deduplication Engine**: Compares candidate titles against database history using Levenshtein distance + token Jaccard overlap to warn before posting repetitive topics.
  - **Subreddit Safety Rules**: Hard limit of **3 posts/24h**, minimum **2-hour cooldown gap**, and automated keyword check against harassment, hate speech, or sensitive personal data.
  - **In-App Scheduler**: Configurable time slots (e.g. `09:00`, `15:00`, `21:00` IST). At designated slots, displays a native desktop notification and opens the approval dialog for the next approved post.
- **Right Panel (~65%) — Mac-Style Browser Frame**:
  - Frameless-styled macOS window card with traffic-light buttons (🔴 🟡 🟢), back/forward/reload controls, and live URL address bar.
  - Genuine embedded Chromium view powered by Electron's modern **`WebContentsView`** (Reddit blocks standard `iframe` embeds). View bounds dynamically synchronize on window resize.
  - **Persistent Session Partition (`persist:reddit`)**: Cookies and session state survive app restarts indefinitely.
  - **Live Reddit Auth Status Chip**: Automatically scans logged-in state on `old.reddit.com` and displays `Logged in as u/<username>` or `Logged out`.
  - **Agent Live Step Bar**: Visual 8-step indicator (`Opening submit page` → `Selecting Text post` → `Typing title` → `Typing body` → `Choosing flair` → `Waiting for confirm` → `Submitting` → `Verifying post URL`), speed slider (`0.5x` to `2.5x`), and instant **Abort / Stop** button.

### 2. Antigravity-Style Visual Agent
- **Visible Cursor Overlay**: Injects a glowing `#FF4500` dot with an "Agent" badge directly into the Reddit page. Moves along a smooth cubic-bezier curve to target elements and performs a ripple-click animation.
- **Natural Human Typing**: Character-by-character typing with randomized 30–90ms delays and punctuation pauses.
- **Strict Approval Policy**: **Mandatory confirmation modal** with title, body, and flair preview prior to any automated browser actions. **No unattended posting** in v1.
- **Fail-Safe & Verification**: Verifies new submission URL redirect upon completion. If an error occurs (rate limit, captcha, flair issue), the agent halts immediately, captures a timestamped screenshot to disk, and marks the post as `failed` without looping.
- **Centralized Selectors**: All DOM selectors are consolidated in `src/main/agent/selectors.ts` for straightforward updates.

---

## 🚀 Quickstart & Setup

### Prerequisites
- **Windows 10/11**
- **Node.js 20+** (tested on Node.js `v24.12.0`)
- **npm 10+**

### Installation
```powershell
# 1. Clone or navigate to the repository
cd d:\reddit-autoshit

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Launch application in development mode
npm run dev
```

### Production Build & Test
```powershell
# Run unit test suite (queue reordering, deduplication math, safety limits)
npm test

# Typecheck and bundle renderer + main process
npm run build

# Package standalone Windows executable (NSIS installer & portable .exe)
npm run package
```

---

## 🔐 How Login Works

1. In the right panel Mac browser toolbar, click **"Log In"**.
2. The embedded Chromium view navigates to `https://www.reddit.com/login`.
3. Enter your Reddit credentials (**username and password**) directly inside the browser window.
4. Once logged in, navigate back to `r/ArreSuno` or click **"Old Reddit"**. The application scans `old.reddit.com` for the username element (`span.user > a`).
5. The status chip updates to **`🟢 Logged in as u/mere_se_nhi_hota`**.
6. **Zero Password Storage**: The application NEVER inspects, intercepts, reads, or logs passwords. Authentication cookies remain safely isolated within Chromium's encrypted `persist:reddit` partition on your machine.

---

## ⚠️ Important Limitations & Gotchas

1. **Google Sign-In Disallowed**:  
   Google blocks OAuth sign-ins inside embedded Chromium web views with `403 disallowed_useragent` for security reasons. **You must log in using your Reddit username and password**. If your account was created with Google, set a password at [reddit.com/settings/account](https://www.reddit.com/settings/account).
2. **Reddit UI Changes**:  
   The posting agent uses `old.reddit.com` for maximum selector stability. If Reddit modifies its form structure, update `src/main/agent/selectors.ts` without touching agent logic.
3. **In-App Scheduler Scope**:  
   The local scheduler runs inside the Electron desktop application. **The app must remain running** on your PC to trigger desktop notifications and present the post approval modal at scheduled slots.

---

## 🧪 Automated Tests

The test suite validates safety limits, deduplication math, and queue state operations:
```powershell
npm test
```
- `tests/limits.test.ts`: Verifies daily limit enforcement (3 posts/day), minimum 2-hour spacing between submissions, and disallowed keyword content filtering.
- `tests/dedup.test.ts`: Verifies Levenshtein distance, token Jaccard similarity, and the 60% similarity warning threshold.
- `tests/queue.test.ts`: Verifies drag-and-drop reordering index updates, status transitions (`draft` → `approved` → `posted`/`failed`), and Fisher-Yates queue shuffle.

---

## 📋 Manual Test Checklist (Agent Posting Flow)

Follow this step-by-step checklist when performing end-to-end verification with Reddit:

| Step | Action | Expected Result | Verified |
| :--- | :--- | :--- | :---: |
| **1. App Launch** | Run `npm run dev` | Left panel displays queue; right panel loads Mac frame with Reddit view. | [ ] |
| **2. Persistent Login** | Click **"Log In"**, enter credentials, restart app | After relaunch, status chip shows `🟢 Logged in as u/...` automatically. | [ ] |
| **3. Post Generation** | In **Generator**, select category (*Chai Tapri Debates*) and click **"Generate Post"** | Gemini generates Hinglish title & body; post appears in queue as `draft`. | [ ] |
| **4. Queue Editing** | Edit post text, change flair, drag to reorder | Changes persist in SQLite database (`arresuno.db`). | [ ] |
| **5. Deduplication Warning** | Create a draft with title very similar to an existing post | Warning banner appears indicating >60% similarity to previous post. | [ ] |
| **6. Safety Limit Guard** | Attempt to post when daily count is 3 or last post was <2h ago | Modal or alert blocks posting with exact cooldown time remaining. | [ ] |
| **7. Approval Modal** | Click **"Post this"** on an approved queue item | Confirm dialog opens showing full title, body, and flair. Posting does NOT start until user clicks **"Approve & Post"**. | [ ] |
| **8. Visible Agent Cursor** | Watch embedded view after approving | Orange glowing circle appears, glides along smooth curve to title/body inputs, and shows click ripple. | [ ] |
| **9. Typing Animation** | Observe text input fields | Text types character-by-character with 30–90ms human cadence. | [ ] |
| **10. Speed Control** | Adjust **Speed Slider** (e.g. `2.0x`) during execution | Cursor glide and typing delay speed up proportionally. | [ ] |
| **11. Abort Button** | Click **"Stop Agent"** mid-execution | Agent stops immediately; step log flags abort; view remains undisturbed. | [ ] |
| **12. Success Verification** | Let agent submit clean post to `r/ArreSuno` | Redirects to `https://old.reddit.com/r/ArreSuno/comments/...`; post status marks `posted` with stored URL. | [ ] |
| **13. Error Handling** | Trigger failure (e.g. remove subreddit name or disconnect net) | Agent halts without looping; captures screenshot to disk; post status marks `failed`. | [ ] |
| **14. Scheduler Slot** | Add upcoming test slot (e.g. 2 minutes ahead) | Desktop notification fires; approval dialog prompts for the next approved post. | [ ] |

---

## 📁 Project Structure

```
arresuno-poster/
├── src/
│   ├── main/
│   │   ├── agent/
│   │   │   ├── selectors.ts       # Centralized old.reddit.com DOM selectors
│   │   │   ├── cursorOverlay.ts   # Glowing orange dot + ripple click overlay
│   │   │   ├── typing.ts          # Human keystroke simulation (30-90ms)
│   │   │   ├── runner.ts          # Agent lifecycle, speed slider, abort flag
│   │   │   └── steps/
│   │   │       └── submitPost.ts  # Step-by-step submission & URL verification
│   │   ├── webViewManager.ts      # WebContentsView with "persist:reddit" session
│   │   ├── db.ts                  # SQLite data layer with sql.js
│   │   ├── dedup.ts               # Levenshtein + token Jaccard similarity
│   │   ├── limits.ts              # 3 posts/day, 2h cooldown, banned content
│   │   ├── safeStorage.ts         # DPAPI-encrypted Gemini API key storage
│   │   ├── scheduler.ts           # IST time-slot scheduler & notifications
│   │   ├── gemini.ts              # Gemini 2.5 Flash Hinglish generation
│   │   ├── ipcHandlers.ts         # Typed IPC bridges
│   │   └── index.ts               # Electron app lifecycle & window
│   ├── preload/
│   │   └── index.ts               # Context-isolated window.api bridge
│   ├── renderer/
│   │   ├── index.html             # HTML entry with custom typography
│   │   └── src/
│   │       ├── components/
│   │       │   ├── MacBrowserFrame.tsx  # Frameless Mac card + bounds sync
│   │       │   ├── AgentControlBar.tsx  # 8-step live indicator & speed slider
│   │       │   ├── PostQueue.tsx        # dnd-kit sortable queue & badges
│   │       │   ├── GeneratorPanel.tsx   # Gemini 5-category Hinglish generator
│   │       │   ├── ConfirmPostModal.tsx # Mandatory human approval dialog
│   │       │   ├── PostEditorModal.tsx  # Edit/create modal with dedup checks
│   │       │   └── SettingsModal.tsx    # SafeStorage, limits, scheduler settings
│   │       ├── App.tsx                  # 35% / 65% split-screen layout
│   │       └── index.css                # Reddit dark theme styles (#0E1113)
│   └── shared/
│       ├── types.ts               # Shared TypeScript models
│       └── ipc.ts                 # IPC channel names
├── tests/
│   ├── limits.test.ts             # Safety rules unit tests
│   ├── dedup.test.ts              # Title similarity unit tests
│   └── queue.test.ts              # Queue ordering & status unit tests
├── vitest.config.ts
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

---

*Built with ❤️ for personal moderation and organic discussion on r/ArreSuno.*
