import unittest
from unittest.mock import patch

from app.services import email_service


class EmailTemplateTest(unittest.TestCase):
    @patch("app.services.email_service._send_email")
    def test_otp_email_has_branded_html(self, send):
        email_service.send_otp_email("user@example.com", "123456", purpose="registration")
        args, kwargs = send.call_args
        html = kwargs.get("html")
        self.assertIsNotNone(html, "OTP email must carry an HTML part")
        self.assertIn("123456", html)
        self.assertIn("college-logo.png", html)
        self.assertIn("#0a1929", html)  # navy header/footer
        self.assertIn("#f59e0b", html)  # amber accent
        self.assertIn("123456", args[2], "plain-text fallback must keep the code")

    @patch("app.services.email_service._send_email")
    def test_credentials_email_has_html_with_login_link(self, send):
        email_service.send_credentials_email("t@example.com", "Ali", "Secret123")
        args, kwargs = send.call_args
        html = kwargs.get("html")
        self.assertIsNotNone(html)
        self.assertIn("Secret123", html)
        self.assertIn("/login", html)
        self.assertIn("college-logo.png", html)


if __name__ == "__main__":
    unittest.main()
