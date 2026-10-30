import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc'
import { Post, AppSettings, PostCategory, LimitCheckResult, DedupCheckResult, RedditAuthStatus, AgentStep } from '../shared/types'

export const api = {
  // Posts & Database
  getPosts: (): Promise<Post[]> => ipcRenderer.invoke(IPC_CHANNELS.GET_POSTS),
  savePost: (post: Post): Promise<{ success: boolean; post: Post }> => ipcRenderer.invoke(IPC_CHANNELS.SAVE_POST, post),
  deletePost: (id: string): Promise<{ success: boolean }> => ipcRenderer.invoke(IPC_CHANNELS.DELETE_POST, id),
  reorderPosts: (posts: Post[]): Promise<{ success: boolean }> => ipcRenderer.invoke(IPC_CHANNELS.REORDER_POSTS, posts),

  // Deduplication & Safety Limits
  checkDedup: (title: string): Promise<DedupCheckResult> => ipcRenderer.invoke(IPC_CHANNELS.CHECK_DEDUP, title),
  checkLimits: (post: Pick<Post, 'title' | 'body'>): Promise<LimitCheckResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_LIMITS, post),

  // Gemini Generator
  generatePost: (category: PostCategory): Promise<Pick<Post, 'title' | 'body' | 'flair'>> =>
    ipcRenderer.invoke(IPC_CHANNELS.GENERATE_POST, category),

  // Settings & SafeStorage
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  saveSettings: (settings: Partial<AppSettings>): Promise<{ success: boolean }> =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, settings),

  // Browser Control & Synchronization
  navigateBrowser: (url: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke(IPC_CHANNELS.NAVIGATE_BROWSER, url),
  browserGoBack: (): Promise<{ success: boolean }> => ipcRenderer.invoke(IPC_CHANNELS.BROWSER_GO_BACK),
  browserGoForward: (): Promise<{ success: boolean }> => ipcRenderer.invoke(IPC_CHANNELS.BROWSER_GO_FORWARD),
  browserReload: (): Promise<{ success: boolean }> => ipcRenderer.invoke(IPC_CHANNELS.BROWSER_RELOAD),
  syncBrowserBounds: (bounds: { x: number; y: number; width: number; height: number }): void =>
    ipcRenderer.send(IPC_CHANNELS.BROWSER_SYNC_BOUNDS, bounds),

  // Push Event Subscriptions
  onBrowserUrlChanged: (callback: (url: string) => void): (() => void) => {
    const handler = (_event: any, url: string) => callback(url)
    ipcRenderer.on(IPC_CHANNELS.BROWSER_URL_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.BROWSER_URL_CHANGED, handler)
  },

  onBrowserAuthChanged: (callback: (status: RedditAuthStatus) => void): (() => void) => {
    const handler = (_event: any, status: RedditAuthStatus) => callback(status)
    ipcRenderer.on(IPC_CHANNELS.BROWSER_AUTH_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.BROWSER_AUTH_CHANGED, handler)
  },

  onAgentStepUpdate: (callback: (step: AgentStep) => void): (() => void) => {
    const handler = (_event: any, step: AgentStep) => callback(step)
    ipcRenderer.on(IPC_CHANNELS.AGENT_STEP_UPDATE, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.AGENT_STEP_UPDATE, handler)
  },

  onPromptApproval: (callback: (post: Post) => void): (() => void) => {
    const handler = (_event: any, post: Post) => callback(post)
    ipcRenderer.on('scheduler:prompt-approval', handler)
    return () => ipcRenderer.removeListener('scheduler:prompt-approval', handler)
  },

  // Agent Execution
  startAgent: (post: Post): Promise<{ success: boolean; url?: string; error?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.START_AGENT, post),
  stopAgent: (): Promise<{ success: boolean }> => ipcRenderer.invoke(IPC_CHANNELS.STOP_AGENT),
  setAgentSpeed: (speed: number): Promise<{ success: boolean }> =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_AGENT_SPEED, speed),
}

export type ElectronAPI = typeof api

contextBridge.exposeInMainWorld('api', api)
