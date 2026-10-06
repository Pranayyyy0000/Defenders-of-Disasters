"""
Notification Service Module for Guardians of Disasters.
Handles SMS disaster alerts via Twilio with dry-run support for test safety.
"""

from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any
import os
import urllib.request
import urllib.error
import urllib.parse
import base64
import json

# Optional twilio library support
try:
    from twilio.rest import Client as TwilioClient
    HAS_TWILIO_LIB = True
except ImportError:
    TwilioClient = None  # type: ignore
    HAS_TWILIO_LIB = False


class NotificationServiceError(Exception):
    """Base exception for NotificationService errors."""
    pass


class NotificationCredentialsMissingError(NotificationServiceError):
    """Raised when required Twilio credentials are missing."""
    pass


@dataclass
class NotificationResult:
    message_sid: str
    recipient: str
    message_body: str
    status: str  # 'delivered', 'sent', 'dry_run_simulated', 'failed'
    is_dry_run: bool
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class NotificationService:
    """Service to broadcast Flood and Heatwave SMS alerts."""

    DEFAULT_FLOOD_MAP_URL = "https://yourusername.github.io/repo-name/outputs/flood_map.html"
    DEFAULT_HEATWAVE_MAP_URL = "https://yourusername.github.io/repo-name/outputs/heatwave_map.html"

    def __init__(
        self,
        account_sid: Optional[str] = None,
        auth_token: Optional[str] = None,
        from_number: Optional[str] = None,
        recipient_number: Optional[str] = None,
        dry_run: Optional[bool] = None,
    ):
        self.account_sid = account_sid or os.environ.get("TWILIO_ACCOUNT_SID", "")
        self.auth_token = auth_token or os.environ.get("TWILIO_AUTH_TOKEN", "")
        self.from_number = from_number or os.environ.get("TWILIO_NUMBER", "")
        self.recipient_number = recipient_number or os.environ.get("RECIPIENT_NUMBER", "")

        # Check if explicitly dry-run, or if DISASTER_SMS_DRY_RUN env var is set
        env_dry_run = os.environ.get("DISASTER_SMS_DRY_RUN", "").lower() in ("1", "true", "yes")
        if dry_run is not None:
            self.dry_run = dry_run
        else:
            self.dry_run = env_dry_run

        self.client = None
        if (
            HAS_TWILIO_LIB
            and TwilioClient is not None
            and self.account_sid
            and self.auth_token
            and not self.is_placeholder_credential(self.account_sid)
        ):
            try:
                self.client = TwilioClient(self.account_sid, self.auth_token)
            except Exception:
                self.client = None

    @staticmethod
    def is_placeholder_credential(val: str) -> bool:
        """Checks if a credential string is a placeholder."""
        if not val:
            return True
        placeholders = ["YOUR_TWILIO_ACCOUNT_SID", "YOUR_TWILIO_AUTH_TOKEN", "MY_TWILIO_KEY", "your_twilio_sid"]
        return any(p.lower() in val.lower() for p in placeholders)

    def send_flood_alert(
        self, map_url: Optional[str] = None, to_number: Optional[str] = None
    ) -> NotificationResult:
        """Sends flood emergency SMS alert matching notebook Cell 10."""
        target_map = map_url or self.DEFAULT_FLOOD_MAP_URL
        body = (
            "🚨 Disaster Alert: Immediate Attention Required 🚨\n"
            "Check the interactive disaster map here:\n"
            f"{target_map}"
        )
        return self.send_sms(message=body, to_number=to_number)

    def send_heatwave_alert(
        self, map_url: Optional[str] = None, to_number: Optional[str] = None
    ) -> NotificationResult:
        """Sends heatwave crisis SMS alert matching notebook Cell 11."""
        target_map = map_url or self.DEFAULT_HEATWAVE_MAP_URL
        body = (
            "🚨 Heatwave Disaster Alert: Immediate Attention Required 🚨\n"
            "Check the interactive disaster map here:\n"
            f"{target_map}"
        )
        return self.send_sms(message=body, to_number=to_number)

    def send_sms(self, message: str, to_number: Optional[str] = None) -> NotificationResult:
        """
        Dispatches an SMS message.
        If dry_run is True, simulates delivery without contacting Twilio.
        """
        recipient = to_number or self.recipient_number
        if not recipient:
            raise NotificationCredentialsMissingError("Recipient phone number is required.")

        # DRY RUN SAFETY: Never make real network calls or charge credits in test/dry-run mode
        if self.dry_run or self.is_placeholder_credential(self.account_sid):
            return NotificationResult(
                message_sid=f"SM_MOCK_{abs(hash(message + recipient)) % 100000000}",
                recipient=recipient,
                message_body=message,
                status="dry_run_simulated",
                is_dry_run=True,
                error=None,
            )

        if not self.account_sid or not self.auth_token or not self.from_number:
            raise NotificationCredentialsMissingError(
                "Twilio credentials incomplete. Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_NUMBER."
            )

        # 1. Official Twilio SDK if available
        if self.client is not None:
            try:
                msg = self.client.messages.create(
                    body=message,
                    from_=self.from_number,
                    to=recipient,
                )
                return NotificationResult(
                    message_sid=msg.sid,
                    recipient=recipient,
                    message_body=message,
                    status=msg.status or "sent",
                    is_dry_run=False,
                    error=None,
                )
            except Exception as e:
                raise NotificationServiceError(f"Twilio SDK failed to dispatch SMS: {e}")

        # 2. Direct Twilio REST API via standard library
        return self._send_via_rest(message, recipient)

    def _send_via_rest(self, message: str, recipient: str) -> NotificationResult:
        """Fallback direct REST API call to Twilio."""
        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"
        data = urllib.parse.urlencode({
            "To": recipient,
            "From": self.from_number,
            "Body": message,
        }).encode("utf-8")

        auth_str = f"{self.account_sid}:{self.auth_token}"
        auth_bytes = base64.b64encode(auth_str.encode("utf-8")).decode("ascii")

        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Authorization": f"Basic {auth_bytes}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=10.0) as resp:
                resp_json = json.loads(resp.read().decode("utf-8"))
                sid = resp_json.get("sid", "SM_UNKNOWN")
                status = resp_json.get("status", "sent")
                return NotificationResult(
                    message_sid=sid,
                    recipient=recipient,
                    message_body=message,
                    status=status,
                    is_dry_run=False,
                    error=None,
                )
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode("utf-8", errors="ignore")
            raise NotificationServiceError(f"Twilio HTTP {e.code}: {e.reason} - {err_msg}")
        except Exception as e:
            raise NotificationServiceError(f"Failed to send Twilio SMS: {e}")
