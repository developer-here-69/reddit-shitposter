/**
 * Centralized DOM Selectors for old.reddit.com
 * Targeted at: https://old.reddit.com/r/ArreSuno/submit
 *
 * Old Reddit is intentionally used for stable, durable, and semantic HTML selectors.
 * If Reddit updates its layout, modify this single file.
 */

export const SELECTORS = {
  // Navigation & Subreddit check
  SUBREDDIT_INPUT: 'input[name="sr"]',
  SUBREDDIT_NAME_LABEL: '.redditname a',

  // Submission Type Tabs
  TAB_TEXT_POST: 'a.text-button',
  TAB_LINK_POST: 'a.link-button',
  SELECTED_TAB: '.tabmenu li.selected a',

  // Input Fields
  TITLE_INPUT: 'textarea[name="title"]',
  BODY_INPUT: 'textarea[name="text"]',

  // Post Flair Selection
  FLAIR_BUTTON: '.flairselectbtn, button.flairselectbtn, .btn.flairselectbtn',
  FLAIR_WINDOW: '.flairselector',
  FLAIR_ITEMS: '.flairselector ul li',
  FLAIR_SAVE_BUTTON: '.flairselector form button[type="submit"], .flairselector .btn',

  // Verification & Submission
  SUBMIT_BUTTON: 'button[name="submit"][type="submit"], input[type="submit"][name="submit"]',
  STATUS_ERROR: '.status.error, #form-error, .error',
  RATE_LIMIT_ERROR: '.status.error:contains("you are doing that too much")',

  // User Auth Detection on old.reddit.com
  LOGGED_IN_USER_LINK: '#header-bottom-right span.user > a',
  LOGIN_FORM: '#header-bottom-right form#login_login-form',
  LOGIN_LINK: '#header-bottom-right a[href*="/login"]',
} as const
