/**
 * Human-like Character-by-Character Typing Engine
 * Simulates stochastic keyboard latencies (30ms - 90ms) with punctuation thinking pauses.
 */

export const TYPING_SCRIPT_TEMPLATE = `
(function() {
  window.__typeIntoElement = async function(selector, text, speedMultiplier = 1) {
    const el = document.querySelector(selector);
    if (!el) throw new Error('Element not found for selector: ' + selector);

    el.focus();
    el.value = '';

    for (let i = 0; i < text.length; i++) {
      if (window.__arresunoAgentAborted) {
        throw new Error('Agent execution paused or stopped by user.');
      }

      const char = text[i];
      el.value += char;

      // Dispatch full suite of keyboard events
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));

      // Natural variable typing cadence
      let baseDelay = 30 + Math.random() * 60; // 30ms - 90ms

      // Punctuation thinking pause
      if (['.', '?', '!', ',', '\\n'].includes(char)) {
        baseDelay += 80 + Math.random() * 100;
      }

      const finalDelay = Math.max(10, baseDelay / speedMultiplier);
      await new Promise((r) => setTimeout(r, finalDelay));
    }
  };
})();
`
