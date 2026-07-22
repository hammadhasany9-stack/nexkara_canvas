"""Resource-level authorization: org role + per-prototype membership.

Casbin (app.core.rbac) governs org-level verbs; this module resolves a user's
effective access to a specific prototype and enforces a minimum level.
"""
from __future__ import annotations

from fastapi import HTTPException, status

from app.models.prototype import AccessLevel, Prototype, PrototypeMember
from app.models.user import OrgRole, User

_RANK = {
    AccessLevel.viewer: 0,
    AccessLevel.commenter: 1,
    AccessLevel.editor: 2,
    AccessLevel.manager: 3,
}


def rank(access: AccessLevel) -> int:
    return _RANK[access]


def effective_access(
    user: User, prototype: Prototype, membership: PrototypeMember | None
) -> AccessLevel | None:
    """Highest access the user has, or None if they can't see the prototype."""
    if prototype.owner_id == user.id or user.org_role == OrgRole.admin:
        return AccessLevel.manager
    if membership is not None:
        return membership.access
    return None


def require(
    user: User,
    prototype: Prototype,
    membership: PrototypeMember | None,
    minimum: AccessLevel,
) -> AccessLevel:
    access = effective_access(user, prototype, membership)
    if access is None:
        # Don't reveal existence to non-members.
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Prototype not found")
    if rank(access) < rank(minimum):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You don't have access to do that")
    return access


def require_admin(user: User) -> None:
    if user.org_role != OrgRole.admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
