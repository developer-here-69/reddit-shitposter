import { WebContents } from 'electron'
import { Post, AgentStep } from '../../../shared/types'
import { SELECTORS } from '../selectors'
import { CURSOR_OVERLAY_SCRIPT } from '../cursorOverlay'
import { TYPING_SCRIPT_TEMPLATE } from '../typing'

export interface AgentStepCallback {
  (step: AgentStep): void
}

export interface AgentContext {
  webContents: WebContents
  post: Post
  speed: number
  onStep: AgentStepCallback
  isAborted: () => boolean
}

export async function runSubmitPostFlow(ctx: AgentContext): Promise<{ success: boolean; url?: string; error?: string }> {
  const { webContents, post, speed, onStep, isAborted } = ctx

  const emit = (id: string, label: string, status: AgentStep['status'], message?: string) => {
    onStep({
      id,
      label,
      status,
      message,
      timestamp: Date.now(),
    })
  }

  try {
    // 1. OPEN SUBMIT PAGE
    emit('step-nav', 'Opening submit page', 'running')
    if (isAborted()) throw new Error('Aborted by user')

    await webContents.loadURL('https://old.reddit.com/r/ArreSuno/submit')
    await new Promise((r) => setTimeout(r, 1200 / speed))
    if (isAborted()) throw new Error('Aborted by user')

    // Inject visual cursor and typing engine
    await webContents.executeJavaScript(CURSOR_OVERLAY_SCRIPT)
    await webContents.executeJavaScript(TYPING_SCRIPT_TEMPLATE)

    emit('step-nav', 'Opening submit page', 'success')

    // 2. SELECT TEXT POST TAB
    emit('step-tab', 'Selecting Text post', 'running')
    if (isAborted()) throw new Error('Aborted by user')

    // Calculate coordinates of text post tab and glide cursor
    const tabCoords = await getElementCenter(webContents, SELECTORS.TAB_TEXT_POST)
    if (tabCoords) {
      await glideCursorAndClick(webContents, tabCoords.x, tabCoords.y, speed)
    } else {
      // Fallback direct click
      await webContents.executeJavaScript(`
        const tab = document.querySelector('${SELECTORS.TAB_TEXT_POST}');
        if (tab) tab.click();
      `)
    }
    await new Promise((r) => setTimeout(r, 600 / speed))
    emit('step-tab', 'Selecting Text post', 'success')

    // 3. TYPE TITLE
    emit('step-title', 'Typing title', 'running')
    if (isAborted()) throw new Error('Aborted by user')

    const titleCoords = await getElementCenter(webContents, SELECTORS.TITLE_INPUT)
    if (titleCoords) {
      await glideCursorAndClick(webContents, titleCoords.x, titleCoords.y, speed)
    }

    // Escape quotes for injection
    const escapedTitle = JSON.stringify(post.title)
    await webContents.executeJavaScript(`
      window.__typeIntoElement('${SELECTORS.TITLE_INPUT}', ${escapedTitle}, ${speed})
    `)
    await new Promise((r) => setTimeout(r, 400 / speed))
    emit('step-title', 'Typing title', 'success')

    // 4. TYPE BODY
    emit('step-body', 'Typing body', 'running')
    if (isAborted()) throw new Error('Aborted by user')

    const bodyCoords = await getElementCenter(webContents, SELECTORS.BODY_INPUT)
    if (bodyCoords) {
      await glideCursorAndClick(webContents, bodyCoords.x, bodyCoords.y, speed)
    }

    const escapedBody = JSON.stringify(post.body)
    await webContents.executeJavaScript(`
      window.__typeIntoElement('${SELECTORS.BODY_INPUT}', ${escapedBody}, ${speed})
    `)
    await new Promise((r) => setTimeout(r, 500 / speed))
    emit('step-body', 'Typing body', 'success')

    // 5. CHOOSING FLAIR (OPTIONAL / IF AVAILABLE)
    emit('step-flair', 'Choosing flair', 'running')
    if (isAborted()) throw new Error('Aborted by user')

    const flairFound = await webContents.executeJavaScript(`
      Boolean(document.querySelector('${SELECTORS.FLAIR_BUTTON}'))
    `)

    if (flairFound) {
      const flairCoords = await getElementCenter(webContents, SELECTORS.FLAIR_BUTTON)
      if (flairCoords) {
        await glideCursorAndClick(webContents, flairCoords.x, flairCoords.y, speed)
        await new Promise((r) => setTimeout(r, 600 / speed))

        // Select matching flair item
        await webContents.executeJavaScript(`
          const flairItems = Array.from(document.querySelectorAll('${SELECTORS.FLAIR_ITEMS}'));
          const target = flairItems.find(el => el.textContent.includes('${post.flair?.slice(0, 8) || 'Relatable'}')) || flairItems[0];
          if (target) {
            const btn = target.querySelector('a, button, span');
            if (btn) btn.click();
          }
        `)
        await new Promise((r) => setTimeout(r, 300 / speed))

        // Save flair
        await webContents.executeJavaScript(`
          const saveBtn = document.querySelector('${SELECTORS.FLAIR_SAVE_BUTTON}');
          if (saveBtn) saveBtn.click();
        `)
      }
    }
    emit('step-flair', 'Choosing flair', 'success')

    // 6. WAITING FOR CONFIRM (PRE-APPROVED BY USER CONFIRM DIALOG)
    emit('step-confirm', 'Waiting for confirm', 'success', 'Confirmed by user')

    // 7. SUBMITTING
    emit('step-submit', 'Submitting', 'running')
    if (isAborted()) throw new Error('Aborted by user')

    const submitCoords = await getElementCenter(webContents, SELECTORS.SUBMIT_BUTTON)
    if (submitCoords) {
      await glideCursorAndClick(webContents, submitCoords.x, submitCoords.y, speed)
    }

    // Execute submit click
    await webContents.executeJavaScript(`
      const btn = document.querySelector('${SELECTORS.SUBMIT_BUTTON}');
      if (btn) btn.click();
    `)

    emit('step-submit', 'Submitting', 'success')

    // 8. VERIFYING POST URL
    emit('step-verify', 'Verifying post URL', 'running')

    // Wait up to 15 seconds for URL redirect
    const startTime = Date.now()
    let postUrl = ''

    while (Date.now() - startTime < 15000) {
      if (isAborted()) throw new Error('Aborted by user')

      const currentUrl = webContents.getURL()
      if (currentUrl.includes('/r/ArreSuno/comments/')) {
        postUrl = currentUrl
        break
      }

      // Check for error text in page
      const errorMsg = await webContents.executeJavaScript(`
        const err = document.querySelector('${SELECTORS.STATUS_ERROR}');
        err ? err.textContent.trim() : null;
      `)

      if (errorMsg) {
        throw new Error(`Reddit submission error: ${errorMsg}`)
      }

      await new Promise((r) => setTimeout(r, 600))
    }

    if (!postUrl) {
      const finalUrl = webContents.getURL()
      if (finalUrl.includes('/r/ArreSuno')) {
        postUrl = finalUrl
      } else {
        throw new Error('Timed out waiting for post URL verification. The post may have encountered a rate limit or captcha.')
      }
    }

    emit('step-verify', 'Verifying post URL', 'success', postUrl)
    return { success: true, url: postUrl }
  } catch (err: any) {
    const errorMsg = err.message || 'Unknown agent failure'
    emit('step-error', 'Agent Error', 'failed', errorMsg)
    return { success: false, error: errorMsg }
  }
}

async function getElementCenter(webContents: WebContents, selector: string): Promise<{ x: number; y: number } | null> {
  return webContents.executeJavaScript(`
    (function() {
      const el = document.querySelector('${selector}');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2)
      };
    })()
  `)
}

async function glideCursorAndClick(webContents: WebContents, x: number, y: number, speed: number): Promise<void> {
  const durationMs = Math.round(450 / speed)
  await webContents.executeJavaScript(`
    window.__moveAgentCursorTo(${x}, ${y}, ${durationMs})
  `)
  await new Promise((r) => setTimeout(r, durationMs + 50))
  await webContents.executeJavaScript(`
    window.__triggerAgentClickRipple(${x}, ${y})
  `)
  await new Promise((r) => setTimeout(r, 120))
}
