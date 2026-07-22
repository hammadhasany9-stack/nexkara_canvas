"""Casbin enforcer (org-role RBAC). Loaded from the model + policy files."""
from __future__ import annotations

from pathlib import Path

import casbin

_HERE = Path(__file__).parent
_MODEL = str(_HERE / "rbac_model.conf")
_POLICY = str(_HERE / "rbac_policy.csv")

_enforcer: casbin.Enforcer | None = None


def get_enforcer() -> casbin.Enforcer:
    global _enforcer
    if _enforcer is None:
        _enforcer = casbin.Enforcer(_MODEL, _POLICY)
    return _enforcer


def can(org_role: str, obj: str, act: str) -> bool:
    return get_enforcer().enforce(org_role, obj, act)
