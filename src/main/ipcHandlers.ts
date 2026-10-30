import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc'
import { Post, AppSettings, PostCategory } from '../shared/types'
import { getPosts, savePost, deletePost, reorderPosts, getSetting, setSetting } from './db'
import { checkDuplicateTitle } from './dedup'
import { checkSafetyLimits, DEFAULT_SAFETY_LIMITS } from './limits'
import { generateHinglishPost } from './gemini'
import { storeEncryptedApiKey, hasStoredApiKey } from './safeStorage'
import { WebViewManager } from './webViewManager'
import { AgentRunner } from './agent/runner'
import { AppScheduler } from './scheduler'

export function registerIpcHandlers(
  mainWindow: BrowserWindow,
  webViewManager: WebViewManager,
  agentRunner: AgentRunner,
  scheduler: AppScheduler
): void {
  // 1. Posts & Database
  ipcMain.handle(IPC_CHANNELS.GET_POSTS, async () => {
    return getPosts()
  })

  ipcMain.handle(IPC_CHANNELS.SAVE_POST, async (_event, post: Post) => {
    savePost(post)
    return { success: true, post }
  })

  ipcMain.handle(IPC_CHANNELS.DELETE_POST, async (_event, id: string) => {
    deletePost(id)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.REORDER_POSTS, async (_event, posts: Post[]) => {
    reorderPosts(posts)
    return { success: true }
  })

  // 2. Deduplication Check
  ipcMain.handle(IPC_CHANNELS.CHECK_DEDUP, async (_event, title: string) => {
    const existing = getPosts()
    return checkDuplicateTitle(title, existing)
  })

  // 3. Safety Limits Check
  ipcMain.handle(IPC_CHANNELS.CHECK_LIMITS, async (_event, post: Pick<Post, 'title' | 'body'>) => {
    const existing = getPosts()
    const maxDaily = parseInt(getSetting('max_posts_per_day', '3'), 10)
    const minGap = parseFloat(getSetting('min_gap_hours', '2'))

    return checkSafetyLimits(post, existing, {
      ...DEFAULT_SAFETY_LIMITS,
      maxPostsPerDay: isNaN(maxDaily) ? 3 : maxDaily,
      minGapHours: isNaN(minGap) ? 2 : minGap,
    })
  })

  // 4. Gemini AI Generator
  ipcMain.handle(IPC_CHANNELS.GENERATE_POST, async (_event, category: PostCategory) => {
    return generateHinglishPost(category)
  })

  // 5. Settings & SafeStorage
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, async () => {
    const schedConfig = scheduler.getConfig()
    const maxDaily = parseInt(getSetting('max_posts_per_day', '3'), 10)
    const minGap = parseFloat(getSetting('min_gap_hours', '2'))
    const speed = parseFloat(getSetting('agent_speed', '1'))

    const settings: AppSettings = {
      geminiApiKey: '', // Don't expose decrypted key across IPC
      hasStoredKey: hasStoredApiKey(),
      subreddit: getSetting('subreddit', 'ArreSuno'),
      maxPostsPerDay: isNaN(maxDaily) ? 3 : maxDaily,
      minGapHours: isNaN(minGap) ? 2 : minGap,
      schedulerEnabled: schedConfig.enabled,
      timeSlots: schedConfig.timeSlots,
      agentSpeed: isNaN(speed) ? 1 : speed,
    }
    return settings
  })

  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, async (_event, settings: Partial<AppSettings>) => {
    if (settings.geminiApiKey) {
      storeEncryptedApiKey(settings.geminiApiKey)
    }
    if (settings.maxPostsPerDay !== undefined) {
      setSetting('max_posts_per_day', String(settings.maxPostsPerDay))
    }
    if (settings.minGapHours !== undefined) {
      setSetting('min_gap_hours', String(settings.minGapHours))
    }
    if (settings.agentSpeed !== undefined) {
      setSetting('agent_speed', String(settings.agentSpeed))
      agentRunner.setSpeed(settings.agentSpeed)
    }
    if (settings.schedulerEnabled !== undefined && settings.timeSlots) {
      scheduler.updateConfig(settings.schedulerEnabled, settings.timeSlots)
    }
    return { success: true }
  })

  // 6. Browser Navigation
  ipcMain.handle(IPC_CHANNELS.NAVIGATE_BROWSER, async (_event, url: string) => {
    webViewManager.navigate(url)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.BROWSER_GO_BACK, async () => {
    webViewManager.goBack()
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.BROWSER_GO_FORWARD, async () => {
    webViewManager.goForward()
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.BROWSER_RELOAD, async () => {
    webViewManager.reload()
    return { success: true }
  })

  ipcMain.on(
    IPC_CHANNELS.BROWSER_SYNC_BOUNDS,
    (_event, bounds: { x: number; y: number; width: number; height: number }) => {
      webViewManager.setBounds(bounds)
    }
  )

  // 7. Agent Execution
  ipcMain.handle(IPC_CHANNELS.START_AGENT, async (_event, post: Post) => {
    // Ensure agent has latest webContents reference
    const wc = webViewManager.getWebContents()
    if (!wc) throw new Error('Embedded browser view is not ready')
    agentRunner.setWebContents(wc)

    // Listen to step updates and stream to renderer
    agentRunner.setStepListener((step) => {
      mainWindow.webContents.send(IPC_CHANNELS.AGENT_STEP_UPDATE, step)
    })

    return agentRunner.runPost(post)
  })

  ipcMain.handle(IPC_CHANNELS.STOP_AGENT, async () => {
    agentRunner.stop()
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.SET_AGENT_SPEED, async (_event, speed: number) => {
    agentRunner.setSpeed(speed)
    setSetting('agent_speed', String(speed))
    return { success: true }
  })
}
