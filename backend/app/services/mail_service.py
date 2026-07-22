"""Email delivery. Dev: log to console. Prod: SMTP."""
from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger("nexkara.mail")


def _send_smtp(to: str, subject: str, body: str) -> None:
    msg = EmailMessage()
    msg["From"] = settings.mail_from
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.starttls()
        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(msg)


def send_email(to: str, subject: str, body: str) -> None:
    if settings.mail_backend == "smtp" and settings.smtp_host:
        _send_smtp(to, subject, body)
    else:
        # Console backend — visible in `docker compose logs api`.
        logger.info("EMAIL to=%s subject=%r\n%s", to, subject, body)
        print(f"\n[DEV EMAIL] to={to} | {subject}\n{body}\n", flush=True)


def send_otp(to: str, code: str, reason: str) -> None:
    subject = "Your Nexkara Canvas verification code"
    body = (
        f"Your {reason} code is: {code}\n\n"
        f"It expires in {settings.otp_ttl_seconds // 60} minutes. "
        "If you didn't request this, you can ignore this email."
    )
    send_email(to, subject, body)
