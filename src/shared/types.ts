export type PostStatus = 'draft' | 'approved' | 'posted' | 'failed'

export type PostCategory =
  | 'Relatable Life'
  | 'Chai Tapri Debates'
  | 'Office Ka Kissa'
  | '2000s Nostalgia'
  | 'Harmless Confessions'

export interface Post {
  id: string
  title: string
  body: string
  flair: string
  status: PostStatus
  order: number
  createdAt: string
  postedAt?: string
  redditUrl?: string
  error?: string
  screenshotPath?: string
}

export interface SafetyLimits {
  maxPostsPerDay: number
  minGapHours: number
  disallowedKeywords: string[]
}

export interface AppSettings {
  geminiApiKey: string
  hasStoredKey: boolean
  subreddit: string
  maxPostsPerDay: number
  minGapHours: number
  schedulerEnabled: boolean
  timeSlots: string[]
  agentSpeed: number
}

export interface LimitCheckResult {
  allowed: boolean
  reason?: string
  dailyCount: number
  maxDaily: number
  lastPostedAt?: string
  hoursSinceLastPost?: number
  minGapHours: number
}

export interface DedupCheckResult {
  isDuplicate: boolean
  similarityScore: number
  matchedTitle?: string
}

export interface RedditAuthStatus {
  isLoggedIn: boolean
  username?: string
  checkedAt: number
}

export interface AgentStep {
  id: string
  label: string
  status: 'pending' | 'running' | 'success' | 'failed'
  message?: string
  timestamp: number
}

export interface AgentState {
  isRunning: boolean
  isPaused: boolean
  speed: number
  currentPostId?: string
  currentStepId?: string
  steps: AgentStep[]
}
