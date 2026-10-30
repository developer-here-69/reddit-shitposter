import { Notification, BrowserWindow } from 'electron'
import { getPosts, getSetting, setSetting } from './db'
import { checkSafetyLimits } from './limits'
import { Post } from '../shared/types'

export class AppScheduler {
  private timer: NodeJS.Timeout | null = null
  private mainWindow: BrowserWindow
  private enabled = false
  private timeSlots: string[] = ['09:00', '15:00', '21:00']
  private lastTriggeredSlot = ''

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
    this.loadConfig()
    this.startChecking()
  }

  private loadConfig(): void {
    const enabledStr = getSetting('scheduler_enabled', 'false')
    this.enabled = enabledStr === 'true'
    const slotsStr = getSetting('scheduler_slots', '["09:00", "15:00", "21:00"]')
    try {
      this.timeSlots = JSON.parse(slotsStr)
    } catch {
      this.timeSlots = ['09:00', '15:00', '21:00']
    }
  }

  public updateConfig(enabled: boolean, slots: string[]): void {
    this.enabled = enabled
    this.timeSlots = slots
    setSetting('scheduler_enabled', String(enabled))
    setSetting('scheduler_slots', JSON.stringify(slots))
  }

  public getConfig(): { enabled: boolean; timeSlots: string[] } {
    return {
      enabled: this.enabled,
      timeSlots: [...this.timeSlots],
    }
  }

  private startChecking(): void {
    if (this.timer) clearInterval(this.timer)
    // Check every 30 seconds
    this.timer = setInterval(() => this.tick(), 30000)
  }

  private tick(): void {
    if (!this.enabled) return

    const now = new Date()
    const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const todaySlotKey = `${now.toDateString()}_${currentHourMin}`

    if (this.timeSlots.includes(currentHourMin) && this.lastTriggeredSlot !== todaySlotKey) {
      this.lastTriggeredSlot = todaySlotKey
      this.triggerScheduledSlot(currentHourMin)
    }
  }

  private triggerScheduledSlot(slotTime: string): void {
    const posts = getPosts()
    const nextApprovedPost = posts.find((p) => p.status === 'approved')

    if (!nextApprovedPost) {
      if (Notification.isSupported()) {
        new Notification({
          title: 'ArreSuno Poster — Scheduled Slot',
          body: `Time slot ${slotTime} reached, but no approved posts are waiting in the queue! Generate or approve a draft.`,
        }).show()
      }
      return
    }

    // Safety limit check
    const limitCheck = checkSafetyLimits(nextApprovedPost, posts)
    if (!limitCheck.allowed) {
      if (Notification.isSupported()) {
        new Notification({
          title: 'ArreSuno Poster — Limits Notice',
          body: `Scheduled slot skipped: ${limitCheck.reason}`,
        }).show()
      }
      return
    }

    // Show system notification
    if (Notification.isSupported()) {
      const notif = new Notification({
        title: 'ArreSuno Poster — Ready to Post',
        body: `Scheduled slot (${slotTime}) reached! Review and click Approve to post: "${nextApprovedPost.title.slice(0, 50)}..."`,
      })
      notif.show()
    }

    // Focus main window and prompt user for approval
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) this.mainWindow.restore()
      this.mainWindow.focus()
      this.mainWindow.webContents.send('scheduler:prompt-approval', nextApprovedPost)
    }
  }

  public destroy(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}
