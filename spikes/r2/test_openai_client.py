"""Credential artifact confidentiality is checked without calling OpenAI."""

import base64
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from cryptography.hazmat.primitives import serialization
import openai_client as client


class ClientTicketTests(unittest.TestCase):
    def test_artifact_contains_only_encrypted_temporary_credential(self):
        with tempfile.TemporaryDirectory(dir=client.ROOT / ".ai-review-context") as temporary:
            root = Path(temporary)
            private = root / "private"
            with patch.multiple(client, ROOT=root, PRIVATE=private, PUBLIC=root / "public.json"):
                client.initialize()
                response = io.BytesIO(json.dumps({"value": "ek_temporary_not_permanent", "expires_at": 9999999999}).encode())
                with patch.dict(client.os.environ, {"CI": "true", "OPENAI_API_KEY": "fake-permanent-key", "GITHUB_SHA": "a" * 40}), \
                     patch.object(client.urllib.request, "urlopen", return_value=response) as provider:
                    client.mint()
                requested = json.loads(provider.call_args.args[0].data)
                self.assertEqual(requested["expires_after"]["seconds"], 600)
                self.assertEqual(requested["session"]["output_modalities"], ["text"])
                artifact = (root / ".ai-review-context/r2-output/client-ticket.json").read_text()
                self.assertNotIn("ek_temporary", artifact)
                self.assertNotIn("fake-permanent-key", artifact)
                key = serialization.load_pem_private_key((private / "client-private.pem").read_bytes(), password=None)
                value = json.loads(key.decrypt(base64.b64decode(json.loads(artifact)["ciphertext"]), client.oaep()))
                self.assertEqual(value["value"], "ek_temporary_not_permanent")
                self.assertEqual(value["sha"], "a" * 40)

    def test_unknown_usage_is_not_silently_free(self):
        with self.assertRaises(ValueError):
            client.cost_upper(None)
        self.assertEqual(client.cost_upper({"input_tokens": 1000, "output_tokens": 100}), 0.0344)

    def test_manual_recovery_preserves_one_failed_slot_and_cannot_repeat(self):
        with tempfile.TemporaryDirectory(dir=client.ROOT / ".ai-review-context") as temporary:
            ledger = Path(temporary) / "attempts.jsonl"
            cases = [{"id": "sample-1-blind"}, {"id": "control-seed-see"}] + [{"id": str(i)} for i in range(12)]
            ledger.write_text('\n'.join(json.dumps({"id": "sample-1-blind", "state": state})
                                        for state in ["pending", "failed_unreconciled"]), encoding="utf-8")
            with self.assertRaises(ValueError):
                client.execution_cases({"cases": cases}, ledger, False)
            result = client.execution_cases({"cases": cases}, ledger, True)
            self.assertEqual(len(result), 13)
            self.assertEqual(result[0]["id"], "sample-1-blind")
            with ledger.open('a', encoding='utf-8') as output:
                output.write('\n' + json.dumps({"state": "manual_recovery_started"}))
            with self.assertRaises(ValueError):
                client.execution_cases({"cases": cases}, ledger, True)


if __name__ == "__main__":
    unittest.main()
