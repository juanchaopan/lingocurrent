"""Compare free ASR on the private saved corpus; never upload audio or call APIs."""

import argparse
import datetime as dt
import hashlib
import importlib.metadata
import itertools
import json
import os
from pathlib import Path
import platform
import re
import sys
import time
import wave

ROOT = Path(__file__).resolve().parents[2]
PRIVATE = ROOT / ".ai-review-context"


def normalize(text):
    return re.sub(r"[^a-z0-9 ]", "", text.lower()).strip()


def read_pcm(path):
    with wave.open(str(path), "rb") as recording:
        if (recording.getnchannels(), recording.getsampwidth(), recording.getframerate()) != (1, 2, 16000):
            raise ValueError("Expected mono PCM16 WAV at 16 kHz")
        return recording.readframes(recording.getnframes())


def load_recognizer(engine, model_path):
    runtime = PRIVATE / ("r2-pocketsphinx-runtime" if engine == "pocketsphinx" else "r2-whisper-runtime")
    sys.path.insert(0, str(runtime))
    if engine == "pocketsphinx":
        from pocketsphinx import Decoder
        decoder = Decoder(samprate=16000, loglevel="ERROR")

        def recognize(pcm):
            decoder.start_utt()
            decoder.process_raw(pcm, False, True)
            decoder.end_utt()
            alternatives = list(itertools.islice(decoder.nbest() or [], 5))
            return [item.hypstr for item in alternatives if item.hypstr]

        return recognize, {"pocketsphinx": importlib.metadata.version("pocketsphinx")}

    import numpy as np
    from faster_whisper import WhisperModel
    model = WhisperModel(str(model_path), device="cpu", compute_type="int8", cpu_threads=1,
                         num_workers=1, local_files_only=True)

    def recognize(pcm):
        audio = np.frombuffer(pcm, dtype="<i2").astype(np.float32) / 32768
        segments, _ = model.transcribe(audio, language="en", beam_size=5, temperature=0,
                                      condition_on_previous_text=False, vad_filter=False)
        text = " ".join(segment.text.strip() for segment in segments).strip()
        # Beam search does not expose five ranked transcripts through this API.
        return [text] if text else []

    return recognize, {name: importlib.metadata.version(name) for name in ["faster-whisper", "ctranslate2", "numpy"]}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("engine", choices=["pocketsphinx", "whisper-base.en"])
    parser.add_argument("--model", type=Path)
    args = parser.parse_args()
    if args.engine.startswith("whisper") and args.model is None:
        parser.error("--model must name an already downloaded local model")
    os.environ.update(HF_HUB_OFFLINE="1", HF_HUB_DISABLE_TELEMETRY="1", TOKENIZERS_PARALLELISM="false")
    manifest_path = PRIVATE / "r2-owner-corpus/manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    started = time.perf_counter()
    recognize, versions = load_recognizer(args.engine, args.model)
    report = {"engine": args.engine, "versions": versions, "platform": platform.platform(),
              "python": platform.python_version(), "model": str(args.model) if args.model else "bundled default US English",
              "model_load_wall_ms": (time.perf_counter() - started) * 1000,
              "at_utc": dt.datetime.now(dt.timezone.utc).isoformat(), "samples": [],
              "note": "Local screening only, not pronunciation assessment or Vercel evidence. No target hint/grammar. No audio upload."}
    for index, sample in enumerate(manifest["samples"]):
        if sample.get("human_confirmed") is not True:
            raise ValueError("Every corpus sample needs an explicit human label")
        path = (manifest_path.parent / sample["file"]).resolve()
        if not path.is_relative_to(manifest_path.parent.resolve()):
            raise ValueError("Recording outside private corpus")
        if hashlib.sha256(path.read_bytes()).hexdigest() != sample["sha256"]:
            raise ValueError("Recording hash mismatch")
        pcm = read_pcm(path)
        started, cpu = time.perf_counter(), time.process_time()
        candidates = recognize(pcm)
        wrong_target = manifest["samples"][(index + 1) % len(manifest["samples"])]["target"]
        report["samples"].append({"id": sample["id"], "sha256": sample["sha256"],
                                  "target": sample["target"], "human_label": sample["label"],
                                  "candidates": candidates,
                                  "matches": {str(k): any(normalize(text) == normalize(sample["target"])
                                                        for text in candidates[:k]) for k in [1, 3, 5]},
                                  "retargeted_control": {"target": wrong_target,
                                                         "accepted": any(normalize(text) == normalize(wrong_target)
                                                                         for text in candidates)},
                                  "wall_ms": (time.perf_counter() - started) * 1000,
                                  "process_cpu_ms": (time.process_time() - cpu) * 1000})
        print(f"{args.engine}: completed {sample['id']}", flush=True)
    # Synthetic silence is a smoke control only, never an owner invalid sample.
    report["synthetic_silence_candidates"] = recognize(bytes(16000 * 2))
    report["candidate_count_note"] = "Whisper exposes one transcript; K=3/5 adds no candidates" if args.engine.startswith("whisper") else "Top five uncalibrated hypotheses"
    output = PRIVATE / "r2-output" / (args.engine + "-local-comparison.json")
    output.parent.mkdir(exist_ok=True)
    output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(str(output))


if __name__ == "__main__":
    main()
