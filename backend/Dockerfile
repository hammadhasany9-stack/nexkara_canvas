FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System build deps. Most dependencies ship wheels; these cover source builds
# (e.g. argon2-cffi -> libffi, any psycopg fallback -> libpq) on arm64/uncommon platforms.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libffi-dev libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy the source BEFORE installing: `pip install .` builds the local "app"
# package (packages = ["app"] in pyproject.toml), so the source must be present.
COPY . .
RUN pip install --upgrade pip && pip install .

# Headless Chromium for the static prototype-card thumbnails (thumbnail_service).
# The feature degrades gracefully (falls back to a live iframe preview) if this
# step is removed, but installing the browser gives the flicker-free snapshots.
RUN playwright install --with-deps chromium

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
