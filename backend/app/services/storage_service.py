"""Object storage for uploaded prototype HTML.

A tiny backend interface so prod uses MinIO/S3 while tests use an in-memory
store — no live bucket needed to run the suite.
"""
from __future__ import annotations

import io
from typing import Protocol

from app.core.config import settings


class Storage(Protocol):
    def put(self, key: str, data: bytes, content_type: str = "text/html") -> None: ...
    def get(self, key: str) -> bytes: ...
    def delete(self, key: str) -> None: ...
    def presigned_url(self, key: str, expires_seconds: int = 3600) -> str: ...


class MemoryStorage:
    """In-process store for tests."""

    def __init__(self) -> None:
        self._objects: dict[str, bytes] = {}

    def put(self, key: str, data: bytes, content_type: str = "text/html") -> None:
        self._objects[key] = data

    def get(self, key: str) -> bytes:
        return self._objects[key]

    def delete(self, key: str) -> None:
        self._objects.pop(key, None)

    def presigned_url(self, key: str, expires_seconds: int = 3600) -> str:
        return f"memory://{settings.minio_bucket}/{key}"


class LocalStorage:
    """Filesystem backend for local dev without MinIO. Keys map to files under a dir."""

    def __init__(self, root: str) -> None:
        import pathlib

        self._root = pathlib.Path(root)
        self._root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str):
        p = (self._root / key).resolve()
        if not str(p).startswith(str(self._root.resolve())):
            raise ValueError("Invalid storage key")
        p.parent.mkdir(parents=True, exist_ok=True)
        return p

    def put(self, key: str, data: bytes, content_type: str = "text/html") -> None:
        self._path(key).write_bytes(data)

    def get(self, key: str) -> bytes:
        return self._path(key).read_bytes()

    def delete(self, key: str) -> None:
        p = self._path(key)
        if p.exists():
            p.unlink()

    def presigned_url(self, key: str, expires_seconds: int = 3600) -> str:
        # Served by the API's content endpoint in dev (Viewer, Plan 03).
        return f"/api/storage/{key}"


class MinioStorage:
    def __init__(self) -> None:
        from minio import Minio

        self._client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )
        self._bucket = settings.minio_bucket
        self._ensure_bucket()

    def _ensure_bucket(self) -> None:
        if not self._client.bucket_exists(self._bucket):
            self._client.make_bucket(self._bucket)

    def put(self, key: str, data: bytes, content_type: str = "text/html") -> None:
        self._client.put_object(
            self._bucket, key, io.BytesIO(data), length=len(data), content_type=content_type
        )

    def get(self, key: str) -> bytes:
        resp = self._client.get_object(self._bucket, key)
        try:
            return resp.read()
        finally:
            resp.close()
            resp.release_conn()

    def delete(self, key: str) -> None:
        self._client.remove_object(self._bucket, key)

    def presigned_url(self, key: str, expires_seconds: int = 3600) -> str:
        import datetime as dt

        url = self._client.presigned_get_object(
            self._bucket, key, expires=dt.timedelta(seconds=expires_seconds)
        )
        # Rewrite the internal host to the browser-facing one when configured.
        if settings.minio_public_endpoint:
            url = url.replace(settings.minio_endpoint, settings.minio_public_endpoint, 1)
        return url


_backend: Storage | None = None


def get_storage() -> Storage:
    global _backend
    if _backend is None:
        if settings.storage_backend == "local":
            _backend = LocalStorage(settings.local_storage_dir)
        else:
            _backend = MinioStorage()
    return _backend


def set_storage_backend(backend: Storage) -> None:
    """Test hook."""
    global _backend
    _backend = backend
