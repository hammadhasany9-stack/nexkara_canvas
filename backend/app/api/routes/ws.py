"""WebSocket endpoint for realtime presence, cursors, and comment events."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.config import settings
from app.core.security import decode_token
from app.db.session import SessionLocal
from app.models.prototype import AccessLevel
from app.services import prototype_service as psvc
from app.services import auth_service
from app.ws import rooms

router = APIRouter()

_COLORS = ["#5aa9e0", "#22c39c", "#e0533d", "#12a986", "#b98bff", "#f0a020"]


def _color_for(user_id: str) -> str:
    h = sum(ord(c) for c in user_id)
    return _COLORS[h % len(_COLORS)]


@router.websocket("/ws/prototypes/{prototype_id}")
async def prototype_room(websocket: WebSocket, prototype_id: str):
    token = websocket.cookies.get(settings.session_cookie_name)
    payload = decode_token(token, "session") if token else None
    if payload is None:
        await websocket.close(code=4401)
        return

    try:
        pid = uuid.UUID(prototype_id)
    except ValueError:
        await websocket.close(code=4404)
        return

    # authorize: viewer+ on this prototype
    async with SessionLocal() as db:
        user = await auth_service.get_by_id(db, payload["sub"])
        if user is None:
            await websocket.close(code=4401)
            return
        proto, membership = await psvc.get_with_membership(db, user, pid)
        from app.core import authz
        if proto is None or authz.effective_access(user, proto, membership) is None:
            await websocket.close(code=4403)
            return
        name = user.display_name
        uid = str(user.id)

    await websocket.accept()
    client_id = uuid.uuid4().hex
    member = rooms.Member(
        ws=websocket, client_id=client_id, user_id=uid, name=name, color=_color_for(uid)
    )
    await websocket.send_json({"type": "hello", "clientId": client_id, "color": member.color})
    await rooms.join(prototype_id, member)

    try:
        while True:
            msg = await websocket.receive_json()
            kind = msg.get("type")
            if kind == "cursor":
                await rooms.update_cursor(prototype_id, client_id, msg.get("cursor"))
            elif kind == "presence":
                # optional: client-driven presence field updates (e.g. current version)
                await rooms.broadcast(
                    prototype_id,
                    {"type": "presence.update", "clientId": client_id, "data": msg.get("data")},
                    exclude=client_id,
                )
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        await rooms.leave(prototype_id, client_id)
