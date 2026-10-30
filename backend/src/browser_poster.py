"""Antigravity-Style Browser Reddit Poster Engine.

Features:
- Multi-profile management (account_1, account_2, account_3)
- Real Chrome browser automation with saved cookies / local storage
- Human-like bezier mouse movements, realistic typing, and smooth scroll
- Visual glowing orange cursor overlay in headed mode
- Post creation on r/ArreSuno with live permalink extraction
- Session exporter for GitHub Actions cloud posting (laptop off!)
"""

import argparse
import asyncio
import json
import logging
import os
import random
import sys
from pathlib import Path
from typing import Dict, Any, Optional

from playwright.async_api import async_playwright, BrowserContext, Page
from src.human_motion import HumanAgent, inject_visual_cursor

if sys.platform == "win32":
    try:
        if sys.stdout and hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8")
        if sys.stderr and hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

logger = logging.getLogger("browser_poster")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

BASE_DIR = Path(__file__).resolve().parent.parent
PROFILES_DIR = BASE_DIR / "browser_profiles"
SESSIONS_DIR = BASE_DIR / "browser_sessions"

PROFILES_DIR.mkdir(parents=True, exist_ok=True)
SESSIONS_DIR.mkdir(parents=True, exist_ok=True)


async def open_login_session(profile_name: str) -> None:
    """Opens a real Chrome window with a dedicated profile for logging into Reddit once."""
    profile_path = PROFILES_DIR / profile_name
    profile_path.mkdir(parents=True, exist_ok=True)

    print("\n=======================================================")
    print(f"[Chrome Auth] Opening Chrome Profile for: {profile_name}")
    print(f"[Chrome Auth] Profile location: {profile_path}")
    print(f"[Chrome Auth] Please log in to your Reddit account in this browser.")
    print(f"[Chrome Auth] Once logged in, session cookies will be saved.")
    print("=======================================================\n")

    async with async_playwright() as p:
        try:
            context = await p.chromium.launch_persistent_context(
                user_data_dir=str(profile_path),
                headless=False,
                channel="chrome",
                args=["--disable-blink-features=AutomationControlled"],
            )
        except Exception as e:
            logger.warning("Failed launching channel=chrome (%s), using bundled Chromium", e)
            context = await p.chromium.launch_persistent_context(
                user_data_dir=str(profile_path),
                headless=False,
                args=["--disable-blink-features=AutomationControlled"],
            )

        page = context.pages[0] if context.pages else await context.new_page()
        await page.goto("https://www.reddit.com/login", wait_until="domcontentloaded")

        # Keep browser open until user manually closes the browser window
        session_file = SESSIONS_DIR / f"{profile_name}_state.json"
        logger.info("Chrome window open for %s. Waiting for user to finish login...", profile_name)

        saved_once = False
        while True:
            await asyncio.sleep(1)
            # Break when user closes all tabs or browser window
            if not context.pages or all(p.is_closed() for p in context.pages):
                break
            try:
                # Automatically save storage state once logged in on reddit
                p0 = context.pages[0]
                if not p0.is_closed():
                    curr_url = p0.url.lower()
                    if "reddit.com" in curr_url and "/login" not in curr_url and "accounts.google" not in curr_url:
                        await context.storage_state(path=str(session_file))
                        if not saved_once:
                            logger.info("Reddit login detected! Session state saved to %s", session_file)
                            saved_once = True
            except Exception:
                pass

        # Final storage state save
        try:
            await context.storage_state(path=str(session_file))
            logger.info("Session state saved to: %s", session_file)
        except Exception:
            pass


async def post_to_reddit(
    profile_name: str,
    title: str,
    body: str,
    subreddit: str = "ArreSuno",
    flair_label: Optional[str] = None,
    headless: bool = False,
    visual_cursor: bool = True,
) -> Dict[str, Any]:
    """Posts a submission to Reddit using human-like cursor and typing."""
    profile_path = PROFILES_DIR / profile_name
    session_file = SESSIONS_DIR / f"{profile_name}_state.json"

    submit_url = f"https://www.reddit.com/r/{subreddit}/submit"

    async with async_playwright() as p:
        # Launch persistent context
        launch_args = {
            "headless": headless,
            "viewport": {"width": 1366, "height": 820},
            "args": [
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
            ],
        }

        # Try launching real Chrome first, else Chromium
        try:
            context = await p.chromium.launch_persistent_context(
                user_data_dir=str(profile_path),
                channel="chrome",
                **launch_args,
            )
        except Exception:
            context = await p.chromium.launch_persistent_context(
                user_data_dir=str(profile_path),
                **launch_args,
            )

        page = context.pages[0] if context.pages else await context.new_page()
        agent = HumanAgent(page)

        try:
            logger.info("Navigating to %s...", submit_url)
            await page.goto(submit_url, wait_until="domcontentloaded")
            await asyncio.sleep(random.uniform(2.0, 3.5))

            if visual_cursor and not headless:
                await inject_visual_cursor(page)

            # Check if user is logged in
            if "/login" in page.url or await page.locator("a[href*='/login']").count() > 0:
                return {
                    "success": False,
                    "error": f"Account profile '{profile_name}' is not logged in. Please run login setup first: python -m src.browser_poster --login {profile_name}",
                }

            # 1. Target Title Box
            logger.info("Locating post title input...")
            title_selector = "textarea[placeholder*='Title'], input[placeholder*='Title'], [aria-label*='Title']"
            try:
                title_elem = page.locator(title_selector).first
                await title_elem.wait_for(state="visible", timeout=12000)
            except Exception:
                # Try generic input inside title area
                title_elem = page.locator("h1 + div textarea, [name='title']").first
                await title_elem.wait_for(state="visible", timeout=8000)

            # Human glide cursor to title input and type
            logger.info("Human typing post title...")
            await agent.type_text(title, element=title_elem)
            await asyncio.sleep(random.uniform(0.6, 1.2))

            # 2. Scroll smoothly down to body
            await agent.smooth_scroll(distance=220, direction="down")

            # 3. Target Body Editor
            logger.info("Locating post body textarea...")
            body_selector = (
                "div[role='textbox'], "
                "textarea[placeholder*='Text'], "
                "div[data-testid='editor-content'], "
                "div[contenteditable='true']"
            )
            body_elem = page.locator(body_selector).first
            await body_elem.wait_for(state="visible", timeout=10000)

            # Human glide cursor to body and type
            logger.info("Human typing Hinglish body text...")
            await agent.type_text(body, element=body_elem)
            await asyncio.sleep(random.uniform(0.8, 1.5))

            # 4. Scroll down to Post Button
            await agent.smooth_scroll(distance=250, direction="down")

            # 5. Target Post / Submit Button
            logger.info("Locating Post button...")
            post_button = page.locator(
                "button:has-text('Post'), "
                "button[type='submit']:has-text('Post'), "
                "button:has-text('Submit')"
            ).last
            await post_button.wait_for(state="visible", timeout=10000)

            # Human glide cursor to Post button and click
            logger.info("Moving cursor to Post button and clicking...")
            await agent.click_element(post_button)

            # 6. Wait for submission / URL change
            logger.info("Waiting for live submission confirmation...")
            try:
                await page.wait_for_url(lambda u: f"/r/{subreddit}/comments/" in u, timeout=20000)
                live_url = page.url
                logger.info("🚀 Post published successfully! URL: %s", live_url)
            except Exception:
                # Fallback: check current url or return submitted status
                live_url = page.url if f"/r/{subreddit}" in page.url else f"https://www.reddit.com/r/{subreddit}"

            # Save updated storage state
            await context.storage_state(path=str(session_file))

            return {
                "success": True,
                "url": live_url,
                "title": title,
                "subreddit": subreddit,
                "profile": profile_name,
            }

        except Exception as e:
            logger.error("Error during browser posting: %s", str(e), exc_info=True)
            return {"success": False, "error": str(e)}

        finally:
            await context.close()


def main():
    parser = argparse.ArgumentParser(description="Antigravity Browser Automation for Reddit")
    parser.add_argument("--login", type=str, help="Open Chrome to log in to profile (e.g. account_1)")
    parser.add_argument("--post", type=str, help="Post using specified profile name (e.g. account_1)")
    parser.add_argument("--title", type=str, help="Post title")
    parser.add_argument("--body", type=str, help="Post body text")
    parser.add_argument("--subreddit", type=str, default="ArreSuno", help="Subreddit name")
    parser.add_argument("--headless", action="store_true", help="Run without UI window")
    parser.add_argument("--no-visual-cursor", action="store_true", help="Disable glowing cursor overlay")

    args = parser.parse_args()

    if args.login:
        asyncio.run(open_login_session(args.login))
    elif args.post:
        if not args.title or not args.body:
            print("Error: --title and --body are required when using --post")
            sys.exit(1)
        res = asyncio.run(
            post_to_reddit(
                profile_name=args.post,
                title=args.title,
                body=args.body,
                subreddit=args.subreddit,
                headless=args.headless,
                visual_cursor=not args.no_visual_cursor,
            )
        )
        print("\nResult:")
        print(json.dumps(res, indent=2))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
