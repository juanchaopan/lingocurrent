"""Audio-only boundaries use mocked model responses; never a paid call."""

import base64
import json
import unittest
from unittest.mock import patch

import app as probe


class OpenAiAudioTests(unittest.TestCase):
    def setUp(self):
        self.payload = {"audio": base64.b64encode(probe.wav_bytes(bytes(32000), 16000)).decode()}
        self.engine = patch.object(probe, "ENGINE", "openai-speak")
        self.engine.start()
        self.addCleanup(self.engine.stop)

    def test_audio_only_deployment_refuses_tts_before_provider_call(self):
        with patch.object(probe, "realtime") as provider:
            with self.assertRaises(ValueError):
                probe.openai_probe({"voice": "marin", "sentence_index": 0})
            provider.assert_not_called()

    def test_blind_transcription_does_not_send_target_or_label(self):
        response = {"text": json.dumps({"transcript": "current", "candidates": ["current", "currant"]}), "usage": {}, "model": "mock"}
        with patch.object(probe, "realtime", return_value=response) as provider:
            result = probe.openai_probe({**self.payload, "mode": "speak_transcribe"})
            self.assertEqual(result["decision"]["transcript"], "current")
            content, _ = provider.call_args.args
            self.assertEqual([item["type"] for item in content], ["input_audio"])
            with self.assertRaises(ValueError):
                probe.openai_probe({**self.payload, "mode": "speak_transcribe", "target": "currant"})
            self.assertEqual(provider.call_count, 1)

    def test_target_judgment_requires_explicit_pronunciation_field(self):
        response = {"text": json.dumps({"transcript": "current", "verdict": "match"}), "usage": {}, "model": "mock"}
        with patch.object(probe, "realtime", return_value=response):
            with self.assertRaises(ValueError):
                probe.openai_probe({**self.payload, "mode": "speak", "target": "currant"})
        response["text"] = json.dumps({"transcript": "current", "verdict": "match",
                                       "pronunciation": "acceptable", "reason": "homophone"})
        with patch.object(probe, "realtime", return_value=response):
            result = probe.openai_probe({**self.payload, "mode": "speak", "target": "currant"})
            self.assertEqual(result["decision"]["pronunciation"], "acceptable")


if __name__ == "__main__":
    unittest.main()
