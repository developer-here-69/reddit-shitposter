import { WebContents, app } from 'electron'
import path from 'path'
import fs from 'fs'
import { Post, AgentState, AgentStep } from '../../shared/types'
import { runSubmitPostFlow } from './steps/submitPost'
import { recordPostSuccess, recordPostFailure } from '../db'

export class AgentRunner {
  private webContents: WebContents | null = null
  private isRunning = false
  private isPaused = false
  private isAbortedFlag = false
  private speed = 1
  private currentPostId: string | undefined
  private steps: AgentStep[] = []
  private stepUpdateListener: ((step: AgentStep) => void) | null = null

  constructor() {}

  public setWebContents(wc: WebContents): void {
    this.webContents = wc
  }

  public setStepListener(listener: (step: AgentStep) => void): void {
    this.stepUpdateListener = listener
  }

  public setSpeed(speed: number): void {
    this.speed = Math.max(0.25, Math.min(3, speed))
  }

  public stop(): void {
    this.isAbortedFlag = true
    this.isRunning = false
    this.isPaused = false
  }

  public getState(): AgentState {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      speed: this.speed,
      currentPostId: this.currentPostId,
      steps: [...this.steps],
    }
  }

  public async runPost(post: Post): Promise<{ success: boolean; url?: string; error?: string }> {
    if (!this.webContents) {
      throw new Error('Embedded browser webContents is not initialized')
    }

    if (this.isRunning) {
      throw new Error('An agent posting flow is already in progress')
    }

    this.isRunning = true
    this.isPaused = false
    this.isAbortedFlag = false
    this.currentPostId = post.id
    this.steps = []

    const onStep = (step: AgentStep) => {
      const idx = this.steps.findIndex((s) => s.id === step.id)
      if (idx >= 0) {
        this.steps[idx] = step
      } else {
        this.steps.push(step)
      }
      if (this.stepUpdateListener) {
        this.stepUpdateListener(step)
      }
    }

    try {
      const result = await runSubmitPostFlow({
        webContents: this.webContents,
        post,
        speed: this.speed,
        onStep,
        isAborted: () => this.isAbortedFlag,
      })

      if (result.success && result.url) {
        recordPostSuccess(post.id, result.url)
        return result
      } else {
        // Capture failure screenshot for inspection
        const screenshotPath = await this.captureFailureScreenshot(post.id)
        const errorMsg = result.error || 'Failed to submit post'
        recordPostFailure(post.id, errorMsg, screenshotPath)
        return { success: false, error: errorMsg }
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Fatal agent exception'
      const screenshotPath = await this.captureFailureScreenshot(post.id)
      recordPostFailure(post.id, errorMsg, screenshotPath)
      return { success: false, error: errorMsg }
    } finally {
      this.isRunning = false
      this.currentPostId = undefined
    }
  }

  private async captureFailureScreenshot(postId: string): Promise<string | undefined> {
    if (!this.webContents) return undefined
    try {
      const img = await this.webContents.capturePage()
      const dir = path.join(app.getPath('userData'), 'screenshots')
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      const filePath = path.join(dir, `fail_${postId}_${Date.now()}.png`)
      fs.writeFileSync(filePath, img.toPNG())
      return filePath
    } catch (e) {
      console.error('Failed to capture failure screenshot:', e)
      return undefined
    }
  }
}
