/**
 * Visual Agent Cursor Overlay Injector
 * Injects a glowing orange dot + "Agent" label into the page.
 * Provides smooth curved bezier motion and click ripple effects.
 */

export const CURSOR_OVERLAY_SCRIPT = `
(function() {
  if (window.__arresunoCursorInjected) return;
  window.__arresunoCursorInjected = true;

  // 1. Create Cursor Container
  const cursor = document.createElement('div');
  cursor.id = 'arresuno-agent-cursor';
  cursor.style.cssText = \`
    position: fixed;
    top: 0;
    left: 0;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #FF4500;
    border: 2.5px solid #FFFFFF;
    box-shadow: 0 0 16px #FF4500, 0 0 30px rgba(255, 69, 0, 0.7);
    pointer-events: none;
    z-index: 2147483647;
    transform: translate3d(-100px, -100px, 0);
    transition: transform 0.05s ease-out;
    display: flex;
    align-items: center;
    justify-content: center;
  \`;

  // 2. Cursor Label Badge
  const badge = document.createElement('div');
  badge.textContent = 'Agent';
  badge.style.cssText = \`
    position: absolute;
    top: -24px;
    left: 14px;
    background: rgba(14, 17, 19, 0.95);
    color: #FFFFFF;
    border: 1px solid #FF4500;
    font-size: 11px;
    font-weight: 700;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    padding: 2px 7px;
    border-radius: 9999px;
    letter-spacing: 0.5px;
    white-space: nowrap;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  \`;
  cursor.appendChild(badge);

  // 3. Ripple Container
  const rippleContainer = document.createElement('div');
  rippleContainer.id = 'arresuno-ripple-container';
  rippleContainer.style.cssText = \`
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 2147483646;
  \`;

  document.documentElement.appendChild(cursor);
  document.documentElement.appendChild(rippleContainer);

  let currentX = 100;
  let currentY = 100;

  // Global helper for moving along a bezier path
  window.__moveAgentCursorTo = function(targetX, targetY, durationMs) {
    return new Promise((resolve) => {
      const startX = currentX;
      const startY = currentY;
      const startTime = performance.now();

      // Cubic Bezier Control Points with slight natural curvature
      const midX = (startX + targetX) / 2 + (Math.random() - 0.5) * 80;
      const midY = (startY + targetY) / 2 + (Math.random() - 0.5) * 60;

      function step(now) {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / durationMs);

        // Ease-out cubic curve
        const easeT = 1 - Math.pow(1 - t, 3);

        // Quadratic bezier interpolation
        const invT = 1 - easeT;
        const x = invT * invT * startX + 2 * invT * easeT * midX + easeT * easeT * targetX;
        const y = invT * invT * startY + 2 * invT * easeT * midY + easeT * easeT * targetY;

        cursor.style.transform = \\\`translate3d(\\\${x}px, \\\${y}px, 0)\\\`;

        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          currentX = targetX;
          currentY = targetY;
          resolve();
        }
      }

      requestAnimationFrame(step);
    });
  };

  // Global helper to play click ripple
  window.__triggerAgentClickRipple = function(x, y) {
    const ripple = document.createElement('div');
    ripple.style.cssText = \`
      position: absolute;
      left: \${x - 12}px;
      top: \${y - 12}px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid #FF4500;
      background: rgba(255, 69, 0, 0.3);
      pointer-events: none;
      animation: arresunoRippleAnim 0.45s ease-out forwards;
    \`;

    if (!document.getElementById('arresuno-ripple-styles')) {
      const style = document.createElement('style');
      style.id = 'arresuno-ripple-styles';
      style.textContent = \`
        @keyframes arresunoRippleAnim {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(2.8); opacity: 0; }
        }
      \`;
      document.head.appendChild(style);
    }

    rippleContainer.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
  };
})();
`
