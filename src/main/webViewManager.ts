import { WebContentsView, BrowserWindow, session, ipcMain } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc'
import { RedditAuthStatus } from '../shared/types'
import { SELECTORS } from './agent/selectors'

export class WebViewManager {
  private view: WebContentsView | null = null
  private mainWindow: BrowserWindow
  private currentUrl = 'https://old.reddit.com/r/ArreSuno'
  private authStatus: RedditAuthStatus = { isLoggedIn: false, checkedAt: Date.now() }
  private currentBounds = { x: 0, y: 0, width: 800, height: 600 }

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
    this.initView()
  }

  private initView(): void {
    // 1. Create WebContentsView with persistent session partition "persist:reddit"
    this.view = new WebContentsView({
      webPreferences: {
        partition: 'persist:reddit',
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    })

    // 2. Attach to BrowserWindow content view
    this.mainWindow.contentView.addChildView(this.view)

    const wc = this.view.webContents

    // 3. Listen to navigation events
    wc.on('did-navigate', (_event, url) => {
      this.currentUrl = url
      this.notifyUrlChange(url)
      this.checkAuthStatus()
    })

    wc.on('did-navigate-in-page', (_event, url) => {
      this.currentUrl = url
      this.notifyUrlChange(url)
    })

    wc.on('did-finish-load', () => {
      this.notifyUrlChange(wc.getURL())
      this.checkAuthStatus()
    })

    // Set reasonable user agent
    wc.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
    )

    // Load initial subreddit view
    wc.loadURL(this.currentUrl)
  }

  public getWebContents() {
    return this.view?.webContents || null
  }

  public setBounds(bounds: { x: number; y: number; width: number; height: number }): void {
    if (!this.view) return
    this.currentBounds = {
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.max(100, Math.round(bounds.width)),
      height: Math.max(100, Math.round(bounds.height)),
    }
    this.view.setBounds(this.currentBounds)
  }

  public navigate(url: string): void {
    if (!this.view) return
    let target = url.trim()
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target
    }
    this.view.webContents.loadURL(target)
  }

  public goBack(): void {
    if (this.view?.webContents.canGoBack()) {
      this.view.webContents.goBack()
    }
  }

  public goForward(): void {
    if (this.view?.webContents.canGoForward()) {
      this.view.webContents.goForward()
    }
  }

  public reload(): void {
    this.view?.webContents.reload()
  }

  public async checkAuthStatus(): Promise<RedditAuthStatus> {
    if (!this.view) return this.authStatus

    try {
      const url = this.view.webContents.getURL()

      // If on old.reddit, inspect username element
      if (url.includes('old.reddit.com')) {
        const username = await this.view.webContents.executeJavaScript(`
          (function() {
            const userEl = document.querySelector('${SELECTORS.LOGGED_IN_USER_LINK}');
            return userEl ? userEl.textContent.trim() : null;
          })()
        `)

        if (username) {
          this.authStatus = {
            isLoggedIn: true,
            username,
            checkedAt: Date.now(),
          }
        } else {
          this.authStatus = {
            isLoggedIn: false,
            checkedAt: Date.now(),
          }
        }
      } else {
        // Query session cookies to check login state if on new reddit
        const cookies = await session.fromPartition('persist:reddit').cookies.get({ domain: '.reddit.com' })
        const hasSession = cookies.some((c) => c.name === 'reddit_session' || c.name === 'token')
        this.authStatus = {
          isLoggedIn: hasSession,
          username: hasSession ? (this.authStatus.username || 'Reddit User') : undefined,
          checkedAt: Date.now(),
        }
      }
    } catch {
      // Ignored
    }

    this.mainWindow.webContents.send(IPC_CHANNELS.BROWSER_AUTH_CHANGED, this.authStatus)
    return this.authStatus
  }

  private notifyUrlChange(url: string): void {
    this.mainWindow.webContents.send(IPC_CHANNELS.BROWSER_URL_CHANGED, url)
  }

  public destroy(): void {
    if (this.view) {
      this.mainWindow.contentView.removeChildView(this.view)
      this.view = null
    }
  }
}
