"""Human-like browser interaction utilities for Antigravity-style automation.

Provides:
- Realistic cubic-bezier mouse cursor movements with acceleration and jitter
- Human-like typing with randomized keystroke latency and natural pauses
- Smooth incremental page scrolling
- Visual glowing cursor overlay so the user can watch the cursor glide live
"""

import asyncio
import math
import random
from typing import Tuple


CURSOR_OVERLAY_SCRIPT = """
(() => {
    if (window.__agCursor) return;
    const dot = document.createElement('div');
    dot.id = '__ag_human_cursor';
    dot.style.position = 'fixed';
    dot.style.width = '24px';
    dot.style.height = '24px';
    dot.style.borderRadius = '50%';
    dot.style.background = 'radial-gradient(circle, #FF4500 0%, rgba(255, 69, 0, 0.5) 60%, transparent 100%)';
    dot.style.boxShadow = '0 0 12px #FF4500, 0 0 24px rgba(255, 69, 0, 0.4)';
    dot.style.pointerEvents = 'none';
    dot.style.zIndex = '2147483647';
    dot.style.transform = 'translate(-50%, -50%)';
    dot.style.transition = 'width 0.15s ease, height 0.15s ease';
    document.documentElement.appendChild(dot);
    window.__agCursor = dot;

    window.addEventListener('mousemove', (e) => {
        dot.style.left = e.clientX + 'px';
        dot.style.top = e.clientY + 'px';
    }, { passive: true });

    window.addEventListener('mousedown', () => {
        dot.style.width = '16px';
        dot.style.height = '16px';
        dot.style.background = '#FF2200';
    }, { passive: true });

    window.addEventListener('mouseup', () => {
        dot.style.width = '24px';
        dot.style.height = '24px';
        dot.style.background = 'radial-gradient(circle, #FF4500 0%, rgba(255, 69, 0, 0.5) 60%, transparent 100%)';
    }, { passive: true });
})();
"""


def _cubic_bezier(p0: float, p1: float, p2: float, p3: float, t: float) -> float:
    """Standard cubic bezier calculation."""
    return (
        (1 - t) ** 3 * p0
        + 3 * (1 - t) ** 2 * t * p1
        + 3 * (1 - t) * t ** 2 * p2
        + t ** 3 * p3
    )


async def inject_visual_cursor(page) -> None:
    """Injects glowing cursor overlay into the page for visual tracking."""
    try:
        await page.evaluate(CURSOR_OVERLAY_SCRIPT)
    except Exception:
        pass


class HumanAgent:
    """Simulates realistic human cursor, typing, and scrolling on a Playwright page."""

    def __init__(self, page):
        self.page = page
        self.mouse = page.mouse
        self.current_x = random.randint(200, 500)
        self.current_y = random.randint(200, 400)

    async def move_to(self, target_x: float, target_y: float, speed_mult: float = 1.0) -> None:
        """Moves the mouse to (target_x, target_y) along a natural curved trajectory."""
        start_x, start_y = self.current_x, self.current_y
        dist = math.hypot(target_x - start_x, target_y - start_y)

        # Skip motion if distance is negligible
        if dist < 4:
            await self.mouse.move(target_x, target_y)
            self.current_x, self.current_y = target_x, target_y
            return

        # Number of steps proportional to distance
        steps = max(18, min(65, int(dist / 14 * speed_mult)))

        # Two bezier control points with natural arching curvature
        mid_x = (start_x + target_x) / 2
        mid_y = (start_y + target_y) / 2
        curvature = random.uniform(-0.25, 0.25) * dist

        ctrl1_x = mid_x + curvature + random.uniform(-15, 15)
        ctrl1_y = mid_y - curvature + random.uniform(-15, 15)
        ctrl2_x = mid_x - curvature + random.uniform(-15, 15)
        ctrl2_y = mid_y + curvature + random.uniform(-15, 15)

        for i in range(1, steps + 1):
            t = i / steps
            # Ease-in-out easing
            ease_t = t * t * (3 - 2 * t)

            x = _cubic_bezier(start_x, ctrl1_x, ctrl2_x, target_x, ease_t)
            y = _cubic_bezier(start_y, ctrl1_y, ctrl2_y, target_y, ease_t)

            # Subtle hand tremor jitter (near end tremor reduces)
            jitter_scale = (1 - ease_t) * 1.5
            x += random.uniform(-jitter_scale, jitter_scale)
            y += random.uniform(-jitter_scale, jitter_scale)

            await self.mouse.move(x, y)
            self.current_x, self.current_y = x, y

            # Non-linear sleep to simulate muscle acceleration/deceleration
            step_delay = random.uniform(0.007, 0.016)
            await asyncio.sleep(step_delay)

        # Exact settle
        await self.mouse.move(target_x, target_y)
        self.current_x, self.current_y = target_x, target_y
        await asyncio.sleep(random.uniform(0.06, 0.15))

    async def click_element(self, element, speed_mult: float = 1.0) -> None:
        """Moves cursor to an element's bounding box and clicks with human timing."""
        box = await element.bounding_box()
        if not box:
            await element.click()
            return

        # Target slightly randomized point inside the element (not dead center)
        pad_x = box["width"] * 0.25
        pad_y = box["height"] * 0.25
        target_x = box["x"] + random.uniform(pad_x, box["width"] - pad_x)
        target_y = box["y"] + random.uniform(pad_y, box["height"] - pad_y)

        await self.move_to(target_x, target_y, speed_mult)
        await asyncio.sleep(random.uniform(0.08, 0.18))  # Pre-click pause

        await self.mouse.down()
        await asyncio.sleep(random.uniform(0.06, 0.12))  # Hold duration
        await self.mouse.up()
        await asyncio.sleep(random.uniform(0.1, 0.25))

    async def type_text(self, text: str, element=None) -> None:
        """Types text with natural human variation, pauses at punctuation, and typing cadence."""
        if element:
            await self.click_element(element)

        for char in text:
            await self.page.keyboard.type(char)

            # Base keystroke delay (40ms - 105ms)
            delay = random.uniform(0.040, 0.105)

            # Natural thinking pauses
            if char in " .,?!;:\n":
                delay += random.uniform(0.12, 0.35)
            elif random.random() < 0.04:  # Occasional slight hesitation
                delay += random.uniform(0.15, 0.3)

            await asyncio.sleep(delay)

    async def smooth_scroll(self, distance: int = 350, direction: str = "down") -> None:
        """Scrolls smoothly down or up in small ergonomic intervals."""
        sign = 1 if direction == "down" else -1
        steps = random.randint(6, 12)
        step_dist = (distance * sign) / steps

        for _ in range(steps):
            jitter = random.uniform(0.85, 1.15)
            await self.page.mouse.wheel(0, step_dist * jitter)
            await asyncio.sleep(random.uniform(0.04, 0.09))
        await asyncio.sleep(random.uniform(0.2, 0.4))
