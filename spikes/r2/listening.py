"""Generate free-library listening samples locally, before any audio compression."""

import argparse
import datetime as dt
import hashlib
import importlib.metadata
import json
from pathlib import Path
import platform
import tempfile
import time

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / ".ai-review-context" / "r2-listening"
TEMPORARY = ROOT / ".ai-review-context" / "r2-native-temp"
TEMPORARY.mkdir(parents=True, exist_ok=True)
tempfile.tempdir = str(TEMPORARY)
TEXT = (
    "On Wednesday, NASA tested a small aircraft above the coast. "
    "Dr. Lee checked the results at 4:45 p.m., then compared all 23 samples. "
    "The new system costs $12.50 per unit, but careful testing matters more than speed."
)


def generate(engine):
    load_start = time.perf_counter()
    if engine == "kokoro":
        from kokoro_onnx import Kokoro
        assets = ROOT / "spikes/r2/cloud/assets"
        model = Kokoro(str(assets / "kokoro.onnx"), str(assets / "voices.bin"))
        voices = ["af_heart", "am_michael"]

        def synthesize(voice):
            return model.create(TEXT, voice=voice, speed=1.0, lang="en-us")

        version = importlib.metadata.version("kokoro-onnx")
    else:
        from supertonic import TTS
        model = TTS(model_dir=ROOT / ".ai-review-context/r2-models/supertonic",
                    auto_download=False, intra_op_num_threads=4, inter_op_num_threads=1)
        voices = ["F1", "M1"]

        def synthesize(voice):
            waveform, _ = model.synthesize(TEXT, voice_style=model.get_voice_style(voice),
                                           lang="en", speed=1.05, total_steps=8)
            return waveform.reshape(-1), model.sample_rate

        version = importlib.metadata.version("supertonic")
    load_ms = (time.perf_counter() - load_start) * 1000
    for voice in voices:
        started, cpu_start = time.perf_counter(), time.process_time()
        waveform, rate = synthesize(voice)
        filename = f"{engine}-{voice}.wav"
        destination = OUTPUT / filename
        sf.write(destination, waveform, rate, subtype="PCM_16")
        receipt = {
            "engine": engine, "version": version, "voice": voice, "text": TEXT,
            "generated_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
            "runtime": platform.platform(), "execution": "local CPU; not Vercel evidence",
            "sample_rate": rate, "seconds": len(waveform) / rate,
            "encoding": "uncompressed mono PCM16 WAV at engine-native sample rate",
            "audio_compression": "none; owner must select voice before compression tests",
            "model_load_ms": load_ms, "synthesis_wall_ms": (time.perf_counter() - started) * 1000,
            "process_cpu_ms": (time.process_time() - cpu_start) * 1000,
            "peak_amplitude": float(np.max(np.abs(waveform))),
            "bytes": destination.stat().st_size,
            "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
            "model_variant": "INT8 ONNX" if engine == "kokoro" else "archived Supertonic 3 ONNX",
        }
        (OUTPUT / (filename + ".json")).write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
        print(filename, round(receipt["seconds"], 2), "seconds", receipt["bytes"], "bytes", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("engine", choices=["kokoro", "supertonic"])
    arguments = parser.parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    generate(arguments.engine)
