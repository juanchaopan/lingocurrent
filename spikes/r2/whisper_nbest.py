"""Actual five-beam Whisper hypotheses for the same private word recordings."""

import hashlib
import json
import os
from pathlib import Path
import sys
import wave

PRIVATE = Path(__file__).resolve().parents[2] / ".ai-review-context"
sys.path.insert(0, str(PRIVATE / "r2-whisper-runtime"))
os.environ.update(HF_HUB_OFFLINE="1", HF_HUB_DISABLE_TELEMETRY="1")

import numpy as np
from faster_whisper import WhisperModel
from faster_whisper.audio import pad_or_trim
from faster_whisper.tokenizer import Tokenizer


def main():
    model = WhisperModel(str(PRIVATE / "r2-models/faster-whisper-base.en/3d3d5dee26484f91867d81cb899cfcf72b96be6c"),
                         device="cpu", compute_type="int8", cpu_threads=1, local_files_only=True)
    tokenizer = Tokenizer(model.hf_tokenizer, model.model.is_multilingual, language="en", task="transcribe")
    prompt = model.get_prompt(tokenizer, [], without_timestamps=True)
    samples = json.loads((PRIVATE / "r2-owner-corpus/manifest.json").read_text(encoding="utf-8"))["samples"]
    rows = []
    for target in ["ship", "avocado", "see", "seed", "currant"]:
        sample = next(item for item in samples if item["target"] == target and not item["control"])
        if sample.get("human_confirmed") is not True:
            raise ValueError("Explicit human label required")
        filename = (PRIVATE / "r2-owner-corpus" / sample["file"]).resolve()
        if not filename.is_relative_to((PRIVATE / "r2-owner-corpus").resolve()):
            raise ValueError("Recording outside corpus")
        if hashlib.sha256(filename.read_bytes()).hexdigest() != sample["sha256"]:
            raise ValueError("Recording changed")
        with wave.open(str(filename), "rb") as recording:
            if (recording.getnchannels(), recording.getsampwidth(), recording.getframerate()) != (1, 2, 16000):
                raise ValueError("Expected 16 kHz PCM16 mono")
            audio = np.frombuffer(recording.readframes(recording.getnframes()), dtype="<i2").astype(np.float32) / 32768
        features = pad_or_trim(model.feature_extractor(audio), length=model.feature_extractor.nb_max_frames)
        result = model.model.generate(model.encode(features), [prompt], beam_size=5, num_hypotheses=5,
                                      return_scores=True, suppress_tokens=[-1], max_length=448)[0]
        rows.append({"target": target, "candidates": [tokenizer.decode(ids).strip() for ids in result.sequences_ids],
                     "raw_scores": result.scores})
        print(target, rows[-1]["candidates"], flush=True)
    report = {"engine": "Whisper base.en / CTranslate2 4.9.0 / CPU INT8 / direct five hypotheses",
              "settings": "beam_size=5, num_hypotheses=5, no target/prefix/history, no timestamps; differs from prior one-transcript wrapper",
              "rows": rows, "note": "Raw scores are not pronunciation probabilities; same private PCM, no upload."}
    (PRIVATE / "r2-output/whisper-nbest-matrix.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
