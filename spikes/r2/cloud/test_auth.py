"""Verify the credential boundary before a probe receives any cloud secrets."""

import base64
import json
import os
import time
import unittest
from unittest.mock import patch

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

import app as probe_app


class AuthenticationTests(unittest.TestCase):
    def setUp(self):
        self.key = Ed25519PrivateKey.generate()
        self.environment = patch.dict(os.environ, {
            "PROBE_OWNER_PUBLIC_KEY": base64.b64encode(self.key.public_key().public_bytes_raw()).decode(),
            "PROBE_RUNNER_PUBLIC_KEY": "",
        })
        self.environment.start()
        self.addCleanup(self.environment.stop)
        self.client = probe_app.app.test_client()

    def signed(self, payload, key=None):
        body = json.dumps(payload).encode()
        signature = base64.b64encode((key or self.key).sign(body)).decode()
        return body, {"X-Probe-Signature": signature, "Content-Type": "application/json"}

    def test_unsigned_and_other_signers_cannot_invoke_models(self):
        with patch.object(probe_app, "load_model") as load:
            self.assertEqual(self.client.post("/probe", json={"timestamp": time.time()}).status_code, 401)
            body, headers = self.signed({"timestamp": time.time()}, Ed25519PrivateKey.generate())
            self.assertEqual(self.client.post("/probe", data=body, headers=headers).status_code, 401)
            load.assert_not_called()

    def test_expired_and_tampered_requests_are_rejected(self):
        with patch.object(probe_app, "load_model") as load:
            body, headers = self.signed({"timestamp": time.time() - 120})
            self.assertEqual(self.client.post("/probe", data=body, headers=headers).status_code, 401)
            body, headers = self.signed({"timestamp": time.time(), "target": "ship"})
            self.assertEqual(self.client.post("/probe", data=body.replace(b"ship", b"sheep"), headers=headers).status_code, 401)
            load.assert_not_called()

    def test_valid_signed_request_reaches_only_the_selected_probe(self):
        body, headers = self.signed({"timestamp": time.time()})
        with patch.object(probe_app, "ENGINE", "kokoro"), \
             patch.object(probe_app, "load_model", return_value=False), \
             patch.object(probe_app, "synthesize_kokoro", return_value={"measured": True}):
            response = self.client.post("/probe", data=body, headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json["result"]["measured"])

    def test_provider_failure_never_echoes_secret_or_input(self):
        body, headers = self.signed({"timestamp": time.time()})
        with patch.object(probe_app, "load_model", side_effect=RuntimeError("secret-and-recording")):
            response = self.client.post("/probe", data=body, headers=headers)
        self.assertEqual(response.status_code, 422)
        self.assertNotIn(b"secret-and-recording", response.data)
        self.assertEqual(response.json["usage"], "unknown_if_provider_request_started")


if __name__ == "__main__":
    unittest.main()
