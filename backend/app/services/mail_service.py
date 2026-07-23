"""Email delivery. Dev: log to console. Prod: SMTP (STARTTLS on 587 or SSL on 465)."""
from __future__ import annotations

import logging
import smtplib
import ssl
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger("nexkara.mail")


def _send_smtp(to: str, subject: str, body: str) -> None:
    msg = EmailMessage()
    msg["From"] = settings.mail_from
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)

    host, port = settings.smtp_host, settings.smtp_port
    if port == 465:
        # Implicit TLS (e.g. some providers' SSL endpoint).
        server = smtplib.SMTP_SSL(host, port, timeout=20, context=ssl.create_default_context())
    else:
        # STARTTLS (587, the common default).
        server = smtplib.SMTP(host, port, timeout=20)
    try:
        server.ehlo()
        if port != 465:
            server.starttls(context=ssl.create_default_context())
            server.ehlo()
        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(msg)
        logger.info("Sent email to %s via %s:%s", to, host, port)
    finally:
        try:
            server.quit()
        except Exception:
            pass


def send_email(to: str, subject: str, body: str) -> None:
    if settings.mail_backend == "smtp" and settings.smtp_host:
        try:
            _send_smtp(to, subject, body)
        except Exception as exc:
            # Don't 500 the request if mail fails — log loudly so it's diagnosable
            # in `docker compose logs api` (auth error, wrong port, blocked, etc.).
            logger.error("SMTP send to %s failed: %s: %s", to, type(exc).__name__, exc)
            print(f"\n[MAIL ERROR] to={to} | {type(exc).__name__}: {exc}\n", flush=True)
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
