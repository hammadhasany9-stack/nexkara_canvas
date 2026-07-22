"""In-process room manager for realtime presence, cursors, and comment events.

One room per prototype. Clients send cursor/presence updates; the server relays
them to the other members (awareness) and pushes comment events emitted by the
REST layer. Single-process fanout — swap in Redis pub/sub for multi-replica.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Any

from fastapi import WebSocket


@dataclass
class Member:
    ws: WebSocket
    client_id: str
    user_id: str
    name: str
    color: str
    cursor: dict[str, float] | None = None


@dataclass
class Room:
    members: dict[str, Member] = field(default_factory=dict)  # client_id -> Member


_rooms: dict[str, Room] = {}
_lock = asyncio.Lock()


def _presence(room: Room) -> list[dict[str, Any]]:
    return [
        {"clientId": m.client_id, "userId": m.user_id, "name": m.name, "color": m.color, "cursor": m.cursor}
        for m in room.members.values()
    ]


async def join(prototype_id: str, member: Member) -> None:
    async with _lock:
        room = _rooms.setdefault(prototype_id, Room())
        room.members[member.client_id] = member
    # tell the newcomer who's here, and tell everyone about the newcomer
    await _send(member.ws, {"type": "presence.sync", "members": _presence(_rooms[prototype_id])})
    await broadcast(prototype_id, {
        "type": "presence.join",
        "member": {"clientId": member.client_id, "userId": member.user_id, "name": member.name, "color": member.color},
    }, exclude=member.client_id)


async def leave(prototype_id: str, client_id: str) -> None:
    async with _lock:
        room = _rooms.get(prototype_id)
        if not room:
            return
        room.members.pop(client_id, None)
        empty = not room.members
        if empty:
            _rooms.pop(prototype_id, None)
    await broadcast(prototype_id, {"type": "presence.leave", "clientId": client_id})


async def update_cursor(prototype_id: str, client_id: str, cursor: dict | None) -> None:
    room = _rooms.get(prototype_id)
    if not room or client_id not in room.members:
        return
    room.members[client_id].cursor = cursor
    await broadcast(prototype_id, {"type": "cursor", "clientId": client_id, "cursor": cursor}, exclude=client_id)


async def broadcast(prototype_id: str, message: dict, exclude: str | None = None) -> None:
    room = _rooms.get(prototype_id)
    if not room:
        return
    dead: list[str] = []
    for cid, m in list(room.members.items()):
        if cid == exclude:
            continue
        try:
            await m.ws.send_json(message)
        except Exception:
            dead.append(cid)
    for cid in dead:
        room.members.pop(cid, None)


async def _send(ws: WebSocket, message: dict) -> None:
    try:
        await ws.send_json(message)
    except Exception:
        pass


def online_count(prototype_id: str) -> int:
    room = _rooms.get(prototype_id)
    return len(room.members) if room else 0
