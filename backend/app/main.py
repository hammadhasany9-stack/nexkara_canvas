"""FastAPI application entrypoint."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.routes import account, auth, notifications, prototypes, users_admin, viewer, ws
from app.core.config import settings
from app.core.rate_limit import limiter

app = FastAPI(title="Nexkara Canvas API", version="0.1.0")

# Rate limiting (slowapi).
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS — the frontend origin. With the Caddy single-origin setup this is mostly
# a dev convenience (Next.js dev server calling the API directly).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="")
app.include_router(prototypes.router, prefix="")
app.include_router(users_admin.router, prefix="")
app.include_router(account.router, prefix="")
app.include_router(notifications.router, prefix="")
app.include_router(viewer.router, prefix="")
app.include_router(viewer.comments_router, prefix="")
app.include_router(ws.router, prefix="")


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
