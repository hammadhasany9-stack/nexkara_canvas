"""Public, isolated-origin rendering of uploaded prototype HTML.

Served from a SEPARATE origin (sandbox_origin) so untrusted uploaded HTML runs
with no access to the app's origin, cookies, or DOM. Auth is a short-lived
signed token (not the session cookie) scoped to a single prototype + version.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import decode_token
from app.db.session import get_db
from app.models.prototype import Prototype
from app.services import prototype_service as psvc
from app.services.storage_service import get_storage

router = APIRouter(tags=["sandbox"])

# Reports its rendered height to the parent so the canvas can auto-size the
# iframe even across origins.
_HEIGHT_REPORTER = (
    "<script>(function(){function h(){try{parent.postMessage("
    "{__nx_height:document.documentElement.scrollHeight},'*')}catch(e){}}"
    "window.addEventListener('load',h);setTimeout(h,600);"
    "try{new ResizeObserver(h).observe(document.body)}catch(e){}})();</script>"
)


def _inject(html: bytes) -> bytes:
    text = html.decode("utf-8", errors="replace")
    if "</body>" in text:
        text = text.replace("</body>", _HEIGHT_REPORTER + "</body>", 1)
    else:
        text += _HEIGHT_REPORTER
    return text.encode("utf-8")


@router.get("/s/{prototype_id}")
async def sandbox_content(
    prototype_id: str, v: int, t: str, db: AsyncSession = Depends(get_db)
) -> Response:
    payload = decode_token(t, "sandbox")
    if payload is None or payload.get("sub") != prototype_id or payload.get("v") != v:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Invalid or expired sandbox token")

    try:
        pid = uuid.UUID(prototype_id)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")

    proto = await db.get(Prototype, pid)
    if proto is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    key = await psvc.content_key(db, proto, v)
    if key is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Version not found")

    try:
        data = _inject(get_storage().get(key))
    except Exception:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Content not found")

    # Only our app may frame it; no sniffing; no cookies were sent (cross-origin).
    frame_ancestors = settings.frontend_origin or "'self'"
    return Response(
        content=data,
        media_type="text/html",
        headers={
            "Content-Security-Policy": f"frame-ancestors {frame_ancestors}",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, max-age=60",
        },
    )
