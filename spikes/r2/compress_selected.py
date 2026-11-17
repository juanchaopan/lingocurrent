"""Compare encodings of the owner's selected original, without regenerating speech."""

import datetime as dt
import hashlib
import json
from pathlib import Path
import subprocess
import time
import wave

DIRECTORY = Path(__file__).resolve().parent
ORIGINAL = DIRECTORY / "evidence/listening/supertonic-F1.wav"
OUTPUT = DIRECTORY / "evidence/compression"
OUTPUT.mkdir(exist_ok=True)
source_receipt = json.loads(ORIGINAL.with_suffix(".wav.json").read_text())
source_sha = hashlib.sha256(ORIGINAL.read_bytes()).hexdigest()
if source_sha != source_receipt["sha256"]:
    raise ValueError("Selected original does not match its generation receipt")
with wave.open(str(ORIGINAL), "rb") as source:
    rate, frames = source.getframerate(), source.getnframes()

choice = {"voice": "supertonic-F1", "sample": "C", "date": "2026-11-17",
          "source": "explicit owner selection in chat", "compression": "awaiting owner comparison",
          "scope": "voice preference; Vercel deployment/capacity is not yet validated"}
(DIRECTORY / "evidence/listening/voice-choice.json").write_text(json.dumps(choice, indent=2) + "\n")
private_choice = DIRECTORY.parents[1] / ".ai-review-context/r2-listening-choice.json"
private_choice.write_text(json.dumps(choice, indent=2) + "\n")

report = {"created_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(), "choice": choice,
          "original": {"file": ORIGINAL.relative_to(DIRECTORY).as_posix(), "bytes": ORIGINAL.stat().st_size,
                       "sha256": source_sha, "sample_rate": rate, "frames": frames,
                       "seconds": frames / rate}, "variants": []}
for bitrate in [32, 48]:
    output = OUTPUT / f"supertonic-F1-{bitrate}k.mp3"
    command = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(ORIGINAL),
               "-map_metadata", "-1", "-ac", "1", "-ar", str(rate), "-codec:a", "libmp3lame",
               "-b:a", f"{bitrate}k", str(output)]
    started = time.perf_counter()
    subprocess.run(command, check=True)
    elapsed = (time.perf_counter() - started) * 1000
    probe = json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries",
        "stream=codec_name,sample_rate,channels,start_time,duration,bit_rate:format=duration,size",
        "-of", "json", str(output),
    ]))
    decoded = subprocess.check_output([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(output),
        "-f", "s16le", "-acodec", "pcm_s16le", "-ac", "1", "-ar", str(rate), "pipe:1",
    ])
    record = {"file": output.name, "bitrate_kbps": bitrate, "bytes": output.stat().st_size,
              "saving_percent": (1 - output.stat().st_size / ORIGINAL.stat().st_size) * 100,
              "encode_wall_ms": elapsed, "decoded_frames": len(decoded) // 2,
              "decoded_frame_delta": len(decoded) // 2 - frames,
              "sha256": hashlib.sha256(output.read_bytes()).hexdigest(), "ffprobe": probe,
              "command": [argument.replace(str(ORIGINAL), "spikes/r2/" + ORIGINAL.relative_to(DIRECTORY).as_posix())
                          .replace(str(output), "spikes/r2/" + output.relative_to(DIRECTORY).as_posix())
                          for argument in command]}
    report["variants"].append(record)
    print(json.dumps({key: record[key] for key in ["file", "bytes", "saving_percent", "encode_wall_ms", "decoded_frame_delta"]}))
report["ffmpeg_version"] = subprocess.check_output(["ffmpeg", "-version"], text=True).splitlines()[0]
(OUTPUT / "measurements.json").write_text(json.dumps(report, indent=2) + "\n")
