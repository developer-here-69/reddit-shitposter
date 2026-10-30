import { app, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import { initDatabase } from './db'
import { WebViewManager } from './webViewManager'
import { AgentRunner } from './agent/runner'
import { AppScheduler } from './scheduler'
import { registerIpcHandlers } from './ipcHandlers'

let mainWindow: BrowserWindow | null = null
let webViewManager: WebViewManager | null = null
let agentRunner: AgentRunner | null = null
let scheduler: AppScheduler | null = null

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 840,
    minWidth: 1100,
    minHeight: 700,
    title: 'ArreSuno Poster',
    backgroundColor: '#0E1113',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // 1. Initialize SQLite Database
  await initDatabase()

  // 2. Initialize Embedded Browser View (WebContentsView)
  webViewManager = new WebViewManager(mainWindow)

  // 3. Initialize Agent Runner & In-App Scheduler
  agentRunner = new AgentRunner()
  const wc = webViewManager.getWebContents()
  if (wc) agentRunner.setWebContents(wc)

  scheduler = new AppScheduler(mainWindow)

  // 4. Register Safe Typed IPC Handlers
  registerIpcHandlers(mainWindow, webViewManager, agentRunner, scheduler)

  // 5. Load Renderer (Vite dev server URL in development, file in production)
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    const candidateA = path.join(__dirname, '../../dist/index.html')
    const candidateB = path.join(app.getAppPath(), 'dist/index.html')
    const fileToLoad = fs.existsSync(candidateA) ? candidateA : candidateB
    mainWindow.loadFile(fileToLoad)
  }

  mainWindow.on('closed', () => {
    if (webViewManager) webViewManager.destroy()
    if (scheduler) scheduler.destroy()
    mainWindow = null
  })
}

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(createWindow)

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
}
