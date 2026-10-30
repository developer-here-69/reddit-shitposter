export interface RedditAccount {
  id: string
  username: string
  clientId: string
  clientSecret: string
  password?: string
  isActive: boolean
  dailyLimit: number
  postedToday: number
  lastPostedAt?: string
  color: string
}

export type PostCategory = "relatable_life" | "question" | "harmless_confession" | "casual_rant"

export interface QueuePost {
  id: string
  title: string
  body: string
  category: PostCategory
  accountId: string
  scheduledAt: string // ISO timestamp
  status: "queued" | "posted" | "failed"
  redditUrl?: string
  errorMessage?: string
  order: number
  createdAt: string
  postedAt?: string
}

export interface DashboardState {
  subreddit: string
  accounts: RedditAccount[]
  posts: QueuePost[]
  geminiModel: string
  lastSyncAt: string
}
