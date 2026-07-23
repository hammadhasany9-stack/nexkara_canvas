"""Realtime rooms backed by Redis pub/sub + presence hashes.

Each process keeps only its *local* WebSocket connections. All fan-out goes
through Redis: messages are published to a per-room channel and a single
per-process subscriber relays them to the local sockets. Presence (who's in a
room) lives in a Redis hash so the online list is correct across replicas.

This makes live cursors / presence / comment events work with any number of
API replicas behind a load balancer.
"""
from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass

from fastapi import WebSocket

from app.core.redis import get_redis

_CHANNEL = "nx:room:"          # + prototype_id
_PRESENCE = "nx:presence:"     # + prototype_id (hash: client_id -> member json)
_PATTERN = "nx:room:*"


@dataclass
class Member:
    ws: WebSocket
    client_id: str
    user_id: str
    name: str
    color: str
    cursor: dict | None = None


# Local sockets only (this process): prototype_id -> {client_id: WebSocket}
_local: dict[str, dict[str, WebSocket]] = {}
_started = False
_task: asyncio.Task | None = None


async def start() -> None:
    """Launch the per-process Redis subscriber (idempotent)."""
    global _started, _task
    if _started:
        return
    _started = True
    _task = asyncio.create_task(_run_subscriber())


async def stop() -> None:
    global _started, _task
    _started = False
    if _task:
        _task.cancel()
        _task = None


async def _run_subscriber() -> None:
    while _started:
        try:
            pubsub = get_redis().pubsub()
            await pubsub.psubscribe(_PATTERN)
            async for msg in pubsub.listen():
                if msg is None or msg.get("type") != "pmessage":
                    continue
                channel = msg["channel"]
                room = channel[len(_CHANNEL):]
                try:
                    payload = json.loads(msg["data"])
                except Exception:
                    continue
                await _deliver_local(room, payload)
        except asyncio.CancelledError:
            return
        except Exception:
            await asyncio.sleep(1)  # reconnect backoff


async def _deliver_local(room: str, payload: dict) -> None:
    conns = _local.get(room)
    if not conns:
        return
    exclude = payload.pop("_exclude", None)
    dead: list[str] = []
    for cid, ws in list(conns.items()):
        if cid == exclude:
            continue
        try:
            await ws.send_json(payload)
        except Exception:
            dead.append(cid)
    for cid in dead:
        conns.pop(cid, None)


async def _publish(room: str, message: dict) -> None:
    await get_redis().publish(_CHANNEL + room, json.dumps(message))


async def join(prototype_id: str, member: Member) -> None:
    await start()
    _local.setdefault(prototype_id, {})[member.client_id] = member.ws
    r = get_redis()
    info = {"userId": member.user_id, "name": member.name, "color": member.color}
    await r.hset(_PRESENCE + prototype_id, member.client_id, json.dumps(info))
    # safety net so a crashed process can't leave presence stale forever
    await r.expire(_PRESENCE + prototype_id, 3600)

    # tell the newcomer who's already here (direct send)
    raw = await r.hgetall(_PRESENCE + prototype_id)
    members = []
    for cid, val in raw.items():
        try:
            m = json.loads(val)
        except Exception:
            continue
        members.append({"clientId": cid, **m, "cursor": None})
    try:
        await member.ws.send_json({"type": "presence.sync", "members": members})
    except Exception:
        pass

    await _publish(prototype_id, {
        "type": "presence.join",
        "member": {"clientId": member.client_id, **info},
        "_exclude": member.client_id,
    })


async def leave(prototype_id: str, client_id: str) -> None:
    conns = _local.get(prototype_id)
    if conns:
        conns.pop(client_id, None)
        if not conns:
            _local.pop(prototype_id, None)
    try:
        await get_redis().hdel(_PRESENCE + prototype_id, client_id)
    except Exception:
        pass
    await _publish(prototype_id, {"type": "presence.leave", "clientId": client_id})


async def update_cursor(prototype_id: str, client_id: str, cursor: dict | None) -> None:
    await _publish(prototype_id, {
        "type": "cursor", "clientId": client_id, "cursor": cursor, "_exclude": client_id,
    })


async def broadcast(prototype_id: str, message: dict, exclude: str | None = None) -> None:
    """Publish a message to the whole room (used by the REST layer for comments)."""
    msg = dict(message)
    if exclude:
        msg["_exclude"] = exclude
    await _publish(prototype_id, msg)


async def online_count(prototype_id: str) -> int:
    try:
        return await get_redis().hlen(_PRESENCE + prototype_id)
    except Exception:
        return 0
