import unittest
from unittest.mock import patch, MagicMock
from src.services.notification_service import (
    NotificationService,
    NotificationResult,
    NotificationCredentialsMissingError,
    NotificationServiceError,
)


class TestNotificationService(unittest.TestCase):

    def setUp(self):
        self.dummy_sid = "AC_TEST_ACCOUNT_SID"
        self.dummy_token = "auth_token_mock_secret"
        self.from_num = "+15551234567"
        self.recipient_num = "+919876543210"

    def test_dry_run_never_calls_network(self):
        service = NotificationService(
            account_sid=self.dummy_sid,
            auth_token=self.dummy_token,
            from_number=self.from_num,
            recipient_number=self.recipient_num,
            dry_run=True,
        )

        result = service.send_flood_alert()

        self.assertIsInstance(result, NotificationResult)
        self.assertTrue(result.is_dry_run)
        self.assertEqual(result.status, "dry_run_simulated")
        self.assertTrue(result.message_sid.startswith("SM_MOCK_"))
        self.assertEqual(result.recipient, self.recipient_num)
        self.assertIn("🚨 Disaster Alert: Immediate Attention Required 🚨", result.message_body)
        self.assertIn("flood_map.html", result.message_body)

    def test_placeholder_credentials_trigger_dry_run(self):
        service = NotificationService(
            account_sid="YOUR_TWILIO_ACCOUNT_SID",
            auth_token="YOUR_TWILIO_AUTH_TOKEN",
            from_number="YOUR_TWILIO_NUMBER",
            recipient_number=self.recipient_num,
        )

        result = service.send_heatwave_alert()

        self.assertTrue(result.is_dry_run)
        self.assertEqual(result.status, "dry_run_simulated")
        self.assertIn("Heatwave", result.message_body)

    def test_missing_recipient_raises_error(self):
        service = NotificationService(
            account_sid=self.dummy_sid,
            auth_token=self.dummy_token,
            from_number=self.from_num,
            recipient_number="",
            dry_run=True,
        )

        with self.assertRaises(NotificationCredentialsMissingError):
            service.send_sms("Test emergency message", to_number="")

    @patch("src.services.notification_service.NotificationService._send_via_rest")
    def test_send_sms_live_mode_calls_rest(self, mock_rest):
        mock_rest.return_value = NotificationResult(
            message_sid="SM123456789",
            recipient=self.recipient_num,
            message_body="Alert text",
            status="queued",
            is_dry_run=False,
            error=None,
        )

        service = NotificationService(
            account_sid=self.dummy_sid,
            auth_token=self.dummy_token,
            from_number=self.from_num,
            recipient_number=self.recipient_num,
            dry_run=False,
        )

        result = service.send_sms("Alert text")

        self.assertFalse(result.is_dry_run)
        self.assertEqual(result.message_sid, "SM123456789")
        mock_rest.assert_called_once_with("Alert text", self.recipient_num)

    def test_flood_and_heatwave_alert_body_formatting(self):
        service = NotificationService(
            recipient_number=self.recipient_num,
            dry_run=True,
        )

        custom_map = "https://custom-portal.gov.in/map.html"
        flood_res = service.send_flood_alert(map_url=custom_map)
        self.assertIn("Disaster Alert: Immediate Attention Required", flood_res.message_body)
        self.assertIn(custom_map, flood_res.message_body)

        heat_res = service.send_heatwave_alert(map_url=custom_map)
        self.assertIn("Heatwave Disaster Alert: Immediate Attention Required", heat_res.message_body)
        self.assertIn(custom_map, heat_res.message_body)


if __name__ == "__main__":
    unittest.main()
