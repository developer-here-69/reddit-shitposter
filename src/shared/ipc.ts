export const IPC_CHANNELS = {
  // Database / Posts
  GET_POSTS: 'db:get-posts',
  SAVE_POST: 'db:save-post',
  DELETE_POST: 'db:delete-post',
  REORDER_POSTS: 'db:reorder-posts',

  // Deduplication & Limits
  CHECK_DEDUP: 'dedup:check',
  CHECK_LIMITS: 'limits:check',

  // Gemini Generator
  GENERATE_POST: 'gemini:generate',

  // Settings & SafeStorage
  GET_SETTINGS: 'settings:get',
  SAVE_SETTINGS: 'settings:save',

  // Embedded Browser Control
  NAVIGATE_BROWSER: 'browser:navigate',
  BROWSER_GO_BACK: 'browser:back',
  BROWSER_GO_FORWARD: 'browser:forward',
  BROWSER_RELOAD: 'browser:reload',
  BROWSER_SYNC_BOUNDS: 'browser:sync-bounds',
  BROWSER_URL_CHANGED: 'browser:url-changed',
  BROWSER_AUTH_CHANGED: 'browser:auth-changed',

  // Agent Control
  START_AGENT: 'agent:start',
  STOP_AGENT: 'agent:stop',
  SET_AGENT_SPEED: 'agent:set-speed',
  AGENT_STEP_UPDATE: 'agent:step-update',
} as const
