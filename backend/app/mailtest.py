"""Send a test email with the current SMTP settings.

Usage (inside the api container or the backend venv):
    python -m app.mailtest you@example.com

Prints the resolved SMTP host/port/user and whether the send succeeded, so you
can confirm Outlook/Office 365 credentials before relying on real OTP delivery.
"""
from __future__ import annotations

import sys

from app.core.config import settings
from app.services import mail_service


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: python -m app.mailtest <recipient-email>")
        raise SystemExit(2)
    to = sys.argv[1]
    print(
        f"backend={settings.mail_backend} host={settings.smtp_host or '(none)'} "
        f"port={settings.smtp_port} user={settings.smtp_user or '(none)'} "
        f"from={settings.mail_from}"
    )
    if settings.mail_backend != "smtp" or not settings.smtp_host:
        print("MAIL_BACKEND is not 'smtp' (or SMTP_HOST is empty) — set them in .env first.")
        raise SystemExit(1)
    try:
        mail_service._send_smtp(  # noqa: SLF001 — intentional direct call to raise on failure
            to,
            "Nexkara Canvas — SMTP test",
            "If you can read this, SMTP delivery is working. OTP emails will arrive the same way.",
        )
        print(f"OK — test email sent to {to}. Check the inbox (and spam).")
    except Exception as exc:  # noqa: BLE001
        print(f"FAILED — {type(exc).__name__}: {exc}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
