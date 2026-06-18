import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

import httpx

from app.config import settings
from app.db.models import Feed, Document
from app.logging_config import get_logger

logger = get_logger(__name__)


class NotificationService:
    def send_notification(self, feed: Feed, document: Document) -> bool:
        logger.info(
            "notification_attempt",
            feed_id=feed.id,
            feed_name=feed.name,
            notification_type=feed.notification_type,
            target=feed.notification_target,
        )
        if feed.notification_type == "email":
            return self._send_email(feed, document)
        elif feed.notification_type == "slack":
            return self._send_slack(feed, document)
        elif feed.notification_type == "discord":
            return self._send_discord(feed, document)
        elif feed.notification_type == "webhook":
            return self._send_webhook(feed, document)
        else:
            logger.warning("unknown_notification_type", type=feed.notification_type)
            return False

    def send_test_notification(self, feed_type: str, target_url: str) -> bool:
        logger.info(
            "test_notification_attempt",
            notification_type=feed_type,
            target=target_url,
        )
        if feed_type == "email":
            return self._send_test_email(target_url)
        elif feed_type == "slack":
            return self._send_test_slack(target_url)
        elif feed_type == "discord":
            return self._send_test_discord(target_url)
        elif feed_type == "webhook":
            return self._send_test_webhook(target_url)
        else:
            logger.warning("unknown_test_notification_type", type=feed_type)
            return False

    def _send_email(self, feed: Feed, document: Document) -> bool:
        if not settings.smtp_host:
            logger.warning("smtp_not_configured")
            return False
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"[OpenBron] New document: {document.title}"
            msg["From"] = settings.smtp_from
            msg["To"] = feed.notification_target or ""
            text = self._format_email_text(feed, document)
            html = self._format_email_html(feed, document)
            msg.attach(MIMEText(text, "plain"))
            msg.attach(MIMEText(html, "html"))
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                if settings.smtp_user and settings.smtp_password:
                    server.starttls()
                    server.login(settings.smtp_user, settings.smtp_password)
                server.send_message(msg)
            logger.info("email_sent", feed_id=feed.id, document_id=document.id)
            return True
        except Exception as exc:
            logger.error("email_failed", feed_id=feed.id, error=str(exc))
            return False

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.HTTPStatusError)),
    )
    def _post_webhook(self, url: str, payload: dict) -> httpx.Response:
        response = httpx.post(url, json=payload, timeout=10)
        response.raise_for_status()
        return response

    def _send_slack(self, feed: Feed, document: Document) -> bool:
        webhook = settings.slack_webhook_url or feed.notification_target
        if not webhook:
            logger.warning("slack_not_configured")
            return False
        try:
            payload = {
                "text": (
                    f"*New OpenBron Document*\n\n"
                    f"*{document.title}*\n"
                    f"Source: {document.source}\n"
                    f"Organization: {document.organization or 'N/A'}\n"
                    f"Date: {document.publication_date}\n"
                    f"Redaction Ratio: {document.redaction_ratio:.1%}\n"
                    f"<{document.source_url or document.pdf_url}|Open Document>"
                ),
            }
            self._post_webhook(webhook, payload)
            logger.info("slack_notification_sent", feed_id=feed.id, document_id=document.id)
            return True
        except Exception as exc:
            logger.error("slack_notification_failed", feed_id=feed.id, error=str(exc))
            return False

    def _send_discord(self, feed: Feed, document: Document) -> bool:
        webhook = feed.notification_target
        if not webhook:
            logger.warning("discord_not_configured")
            return False
        try:
            content = (
                f"**New OpenBron Document**\n\n"
                f"**{document.title}**\n"
                f"Source: {document.source}\n"
                f"Organization: {document.organization or 'N/A'}\n"
                f"Date: {document.publication_date}\n"
                f"Redaction: {document.redaction_ratio:.1%}\n"
                f"{document.source_url or document.pdf_url}"
            )
            payload = {"username": "OpenBron", "content": content}
            self._post_webhook(webhook, payload)
            logger.info("discord_notification_sent", feed_id=feed.id, document_id=document.id)
            return True
        except Exception as exc:
            logger.error("discord_notification_failed", feed_id=feed.id, error=str(exc))
            return False

    def _send_webhook(self, feed: Feed, document: Document) -> bool:
        if not feed.notification_target:
            logger.warning("webhook_not_configured")
            return False
        try:
            payload = {
                "event": "new_document",
                "feed_id": feed.id,
                "feed_name": feed.name,
                "document": {
                    "id": document.id,
                    "title": document.title,
                    "source": document.source,
                    "source_url": document.source_url,
                    "pdf_url": document.pdf_url,
                    "publication_date": (
                        str(document.publication_date) if document.publication_date else None
                    ),
                    "organization": document.organization,
                    "redaction_ratio": document.redaction_ratio,
                },
                "timestamp": datetime.utcnow().isoformat(),
            }
            self._post_webhook(feed.notification_target, payload)
            logger.info("webhook_sent", feed_id=feed.id, document_id=document.id)
            return True
        except Exception as exc:
            logger.error("webhook_failed", feed_id=feed.id, error=str(exc))
            return False

    def _send_test_email(self, target: str) -> bool:
        if not settings.smtp_host:
            logger.warning("smtp_not_configured")
            return False
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = "[OpenBron] Test notification"
            msg["From"] = settings.smtp_from
            msg["To"] = target
            text = (
                "This is a test notification from OpenBron.\n\n"
                "If you received this, your email alert configuration is working correctly."
            )
            html = (
                '<html><body style="font-family:sans-serif;padding:20px;">'
                "<h2>OpenBron Test Notification</h2>"
                "<p>This is a test notification from OpenBron.</p>"
                "<p>If you received this, your email alert configuration is working correctly.</p>"
                "<hr><small>OpenBron - Self-hosted government document search</small>"
                "</body></html>"
            )
            msg.attach(MIMEText(text, "plain"))
            msg.attach(MIMEText(html, "html"))
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                if settings.smtp_user and settings.smtp_password:
                    server.starttls()
                    server.login(settings.smtp_user, settings.smtp_password)
                server.send_message(msg)
            logger.info("test_email_sent", target=target)
            return True
        except Exception as exc:
            logger.error("test_email_failed", target=target, error=str(exc))
            return False

    def _send_test_slack(self, webhook: str) -> bool:
        if not webhook:
            logger.warning("slack_not_configured")
            return False
        try:
            payload = {
                "text": (
                    "This is a test notification from OpenBron.\n"
                    "If you received this, your Slack alert configuration "
                    "is working correctly."
                ),
            }
            self._post_webhook(webhook, payload)
            logger.info("test_slack_sent")
            return True
        except Exception as exc:
            logger.error("test_slack_failed", error=str(exc))
            return False

    def _send_test_discord(self, webhook: str) -> bool:
        if not webhook:
            logger.warning("discord_not_configured")
            return False
        try:
            payload = {
                "username": "OpenBron",
                "content": (
                    "This is a test notification from OpenBron.\n"
                    "If you received this, your Discord alert configuration "
                    "is working correctly."
                ),
            }
            self._post_webhook(webhook, payload)
            logger.info("test_discord_sent")
            return True
        except Exception as exc:
            logger.error("test_discord_failed", error=str(exc))
            return False

    def _send_test_webhook(self, target: str) -> bool:
        if not target:
            logger.warning("webhook_not_configured")
            return False
        try:
            payload = {
                "event": "test",
                "message": (
                    "This is a test notification from OpenBron. "
                    "If you received this, your webhook alert configuration "
                    "is working correctly."
                ),
                "timestamp": datetime.utcnow().isoformat(),
            }
            self._post_webhook(target, payload)
            logger.info("test_webhook_sent")
            return True
        except Exception as exc:
            logger.error("test_webhook_failed", error=str(exc))
            return False

    def _format_email_text(self, feed: Feed, document: Document) -> str:
        return (
            f"New document matching your feed '{feed.name}':\n\n"
            f"Title: {document.title}\n"
            f"Source: {document.source}\n"
            f"Organization: {document.organization or 'N/A'}\n"
            f"Publication Date: {document.publication_date}\n"
            f"Redaction Ratio: {document.redaction_ratio:.1%}\n"
            f"URL: {document.source_url or document.pdf_url}\n\n"
            "---\nOpenBron - Self-hosted government document search"
        )

    def _format_email_html(self, feed: Feed, document: Document) -> str:
        org = document.organization or "N/A"
        return f"""<html><body style="font-family:sans-serif;padding:20px;">
<h2>New document matching feed: {feed.name}</h2>
<table style="border-collapse:collapse;">
<tr><td style="font-weight:bold;padding:4px 8px">Title:</td><td>{document.title}</td></tr>
<tr><td style="font-weight:bold;padding:4px 8px">Source:</td><td>{document.source}</td></tr>
<tr><td style="font-weight:bold;padding:4px 8px">Organization:</td><td>{org}</td></tr>
<tr><td style="font-weight:bold;padding:4px 8px">Date:</td><td>{document.publication_date}</td></tr>
<tr><td style="font-weight:bold;padding:4px 8px">Redaction:</td>
  <td>{document.redaction_ratio:.1%}</td></tr>
</table>
<p><a href="{document.source_url or document.pdf_url}">Open Document</a></p>
<hr><small>OpenBron - Self-hosted government document search</small>
</body></html>"""
