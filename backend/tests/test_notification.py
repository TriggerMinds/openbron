from unittest.mock import patch, MagicMock

from app.alerts.notification import NotificationService


class TestNotificationService:
    def setup_method(self):
        self.service = NotificationService()

    def test_send_unknown_type(self):
        feed = MagicMock()
        feed.notification_type = "unknown"
        feed.id = 1
        feed.name = "test"
        document = MagicMock()
        document.id = 1
        result = self.service.send_notification(feed, document)
        assert result is False

    def test_send_test_unknown_type(self):
        result = self.service.send_test_notification("unknown", "http://example.com")
        assert result is False

    @patch("app.alerts.notification.settings")
    def test_send_email_no_smtp(self, mock_settings):
        mock_settings.smtp_host = None
        feed = MagicMock()
        feed.notification_type = "email"
        feed.id = 1
        feed.name = "test"
        document = MagicMock()
        document.id = 1
        result = self.service.send_notification(feed, document)
        assert result is False

    @patch("app.alerts.notification.settings")
    def test_slack_no_webhook(self, mock_settings):
        mock_settings.slack_webhook_url = None
        feed = MagicMock()
        feed.notification_type = "slack"
        feed.notification_target = None
        feed.id = 1
        feed.name = "test"
        document = MagicMock()
        document.id = 1
        result = self.service.send_notification(feed, document)
        assert result is False

    def test_discord_no_webhook(self):
        feed = MagicMock()
        feed.notification_type = "discord"
        feed.notification_target = None
        feed.id = 1
        feed.name = "test"
        document = MagicMock()
        document.id = 1
        result = self.service.send_notification(feed, document)
        assert result is False

    def test_webhook_no_target(self):
        feed = MagicMock()
        feed.notification_type = "webhook"
        feed.notification_target = None
        feed.id = 1
        feed.name = "test"
        document = MagicMock()
        document.id = 1
        result = self.service.send_notification(feed, document)
        assert result is False

    @patch("app.alerts.notification.httpx.post")
    def test_webhook_success(self, mock_post):
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response

        feed = MagicMock()
        feed.notification_type = "webhook"
        feed.notification_target = "http://example.com/hook"
        feed.id = 1
        feed.name = "test-feed"
        document = MagicMock()
        document.id = 42
        document.title = "Test Doc"
        document.source = "openoverheid"
        document.source_url = "http://example.com/doc"
        document.pdf_url = "http://example.com/doc.pdf"
        document.organization = "Test Org"
        document.redaction_ratio = 0.25
        document.publication_date = "2024-01-01"

        result = self.service.send_notification(feed, document)
        assert result is True
        mock_post.assert_called_once()

    @patch("app.alerts.notification.httpx.post")
    def test_test_webhook_success(self, mock_post):
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response

        result = self.service._send_test_webhook("http://example.com/test")
        assert result is True
        mock_post.assert_called_once()

    @patch("app.alerts.notification.httpx.post")
    def test_discord_success(self, mock_post):
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response

        feed = MagicMock()
        feed.notification_type = "discord"
        feed.notification_target = "http://discord.com/webhook"
        feed.id = 5
        feed.name = "discord-feed"
        document = MagicMock()
        document.id = 99
        document.title = "Discord Doc"
        document.source = "ibabs"
        document.source_url = "http://example.com"
        document.pdf_url = "http://example.com/pdf"
        document.organization = "Test"
        document.redaction_ratio = 0.1
        document.publication_date = "2024-06-01"

        result = self.service.send_notification(feed, document)
        assert result is True
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        assert call_args[0][0] == "http://discord.com/webhook"
        assert call_args[1]["json"]["username"] == "OpenBron"
