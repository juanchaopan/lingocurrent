"""Loopback transport tests use synthetic bytes and a disposable corpus only."""

import base64
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import wave

spec = importlib.util.spec_from_file_location("local_lab", Path(__file__).parent / "local_lab.py")
lab = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lab)


class LocalLabTests(unittest.TestCase):
    def setUp(self):
        self.client = lab.app.test_client()
        lab.PRIVATE.mkdir(parents=True, exist_ok=True)
        self.temporary = tempfile.TemporaryDirectory(dir=lab.PRIVATE)
        self.addCleanup(self.temporary.cleanup)
        temporary_path = Path(self.temporary.name)
        self.paths = patch.multiple(lab, PRIVATE=temporary_path, CORPUS=temporary_path / "corpus")
        self.paths.start()
        self.addCleanup(self.paths.stop)
        audio = io.BytesIO()
        with wave.open(audio, "wb") as stream:
            stream.setnchannels(1)
            stream.setsampwidth(2)
            stream.setframerate(16000)
            stream.writeframes(bytes(32000))
        self.payload = {"audio": base64.b64encode(audio.getvalue()).decode(), "target": "ship",
                        "label": "correct", "human_confirmed": True}

    def post(self, endpoint, payload, origin="http://127.0.0.1:8765"):
        return self.client.post(endpoint, base_url="http://127.0.0.1:8765", json=payload,
                                headers={"Origin": origin})

    def test_cross_origin_requests_cannot_save_recordings_or_choices(self):
        self.assertEqual(self.post("/save-sample", self.payload, "https://untrusted.example").status_code, 403)
        self.assertEqual(self.post("/voice-choice", {"voice": "none"}, "https://untrusted.example").status_code, 403)
        self.assertFalse(lab.CORPUS.exists())
        self.assertFalse((lab.PRIVATE / "r2-listening-choice.json").exists())

    def test_recording_needs_explicit_human_label(self):
        self.payload["human_confirmed"] = False
        self.assertEqual(self.post("/save-sample", self.payload).status_code, 400)
        self.assertFalse(lab.CORPUS.exists())

    def test_duplicate_clip_is_not_counted_twice_and_controls_are_separate(self):
        for _ in range(2):
            response = self.post("/save-sample", self.payload)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json["counts"]["correct"], 1)
        control = {**self.payload, "target": "sheep", "label": "wrong", "control": True}
        response = self.post("/save-sample", control)
        self.assertEqual(response.json["counts"], {"correct": 1, "wrong": 0, "invalid": 0, "control": 1})
        self.assertEqual(len(list(lab.CORPUS.glob("*.wav"))), 1)

    def test_no_automatic_voice_choice_or_compression(self):
        self.assertEqual(self.post("/voice-choice", {"voice": "not-a-voice"}).status_code, 400)
        self.assertFalse((lab.PRIVATE / "r2-listening-choice.json").exists())
        self.assertEqual(self.post("/voice-choice", {"voice": "undecided"}).status_code, 200)
        result = json.loads((lab.PRIVATE / "r2-listening-choice.json").read_text())
        self.assertEqual(result["voice"], "undecided")
        self.assertIn("not tested", result["compression"])


if __name__ == "__main__":
    unittest.main()
