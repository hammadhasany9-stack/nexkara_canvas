"""Server-side prototype thumbnails.

Renders the uploaded HTML once in a headless Chromium and caches a static PNG in
object storage. Cards then show a still image instead of a live iframe, so
JS-driven prototypes no longer keep animating (flickering) in the grid.

Best-effort: if a browser isn't available the caller falls back to the live
iframe preview, so nothing breaks when Playwright/Chromium aren't installed.
"""
from __future__ import annotations

import asyncio
import logging
import os
import uuid

log = logging.getLogger("thumbnails")

_VIEWPORT_W = 1280
_VIEWPORT_H = 800
_CLIP_H = 720  # 16:9 crop of the top of the page

_lock = asyncio.Lock()
_pw = None
_browser = None
_disabled = False


def _thumb_key(prototype_id: uuid.UUID, version: int) -> str:
    return f"thumbnails/{prototype_id}/v{version}.png"


async def _get_browser():
    """Launch (once) and reuse a headless Chromium. Returns None if unavailable."""
    global _pw, _browser, _disabled
    if _disabled:
        return None
    if _browser is not None:
        return _browser
    try:
        from playwright.async_api import async_playwright

        _pw = await async_playwright().start()
        exe = os.environ.get("CHROMIUM_PATH") or None
        _browser = await _pw.chromium.launch(
            executable_path=exe,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        return _browser
    except Exception as exc:  # noqa: BLE001 — any failure disables the feature
        log.warning("[thumbnails] disabled: %s", exc)
        _disabled = True
        return None


async def _render_png(html: bytes) -> bytes | None:
    browser = await _get_browser()
    if browser is None:
        return None
    ctx = None
    try:
        ctx = await browser.new_context(
            viewport={"width": _VIEWPORT_W, "height": _VIEWPORT_H},
            device_scale_factor=1,
            java_script_enabled=True,
        )
        page = await ctx.new_page()
        page.set_default_timeout(8000)
        try:
            # domcontentloaded (not full "load") so a slow/blocked external
            # resource can't hang the render.
            await page.set_content(html.decode("utf-8", "replace"), wait_until="domcontentloaded")
        except Exception:
            pass  # snapshot whatever painted
        # Let a first paint / initial JS settle, then snapshot a single frame.
        await page.wait_for_timeout(700)
        return await page.screenshot(
            clip={"x": 0, "y": 0, "width": _VIEWPORT_W, "height": _CLIP_H}
        )
    except Exception as exc:  # noqa: BLE001
        log.warning("[thumbnails] render failed: %s", exc)
        return None
    finally:
        if ctx is not None:
            try:
                await ctx.close()
            except Exception:
                pass


async def get_or_render(storage, prototype_id: uuid.UUID, version: int, html_key: str) -> bytes | None:
    """Return a cached PNG, rendering + caching it on first request."""
    key = _thumb_key(prototype_id, version)
    try:
        return storage.get(key)  # cached hit
    except Exception:
        pass

    try:
        html = storage.get(html_key)
    except Exception:
        return None

    async with _lock:  # serialize renders — one browser, avoid thundering herd
        # Re-check the cache: another request may have rendered while we waited.
        try:
            return storage.get(key)
        except Exception:
            pass
        png = await _render_png(html)
        if png is None:
            return None
        try:
            storage.put(key, png, "image/png")
        except Exception:
            pass
        return png


def invalidate(storage, prototype_id: uuid.UUID, version: int) -> None:
    try:
        storage.delete(_thumb_key(prototype_id, version))
    except Exception:
        pass


async def shutdown() -> None:
    global _pw, _browser
    try:
        if _browser is not None:
            await _browser.close()
    except Exception:
        pass
    try:
        if _pw is not None:
            await _pw.stop()
    except Exception:
        pass
    _browser = None
    _pw = None
