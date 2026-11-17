"""Loopback-only listening and owner microphone lab. No paid/cloud calls."""

import base64
import datetime as dt
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import threading
import time

from flask import Flask, abort, jsonify, request, send_file

DIRECTORY = Path(__file__).resolve().parent
ROOT = DIRECTORY.parents[1]
PRIVATE = ROOT / ".ai-review-context"
LISTENING = DIRECTORY / "evidence/listening"
COMPRESSION = DIRECTORY / "evidence/compression"
CORPUS = PRIVATE / "r2-owner-corpus"
VOICES = ["kokoro-af_heart", "kokoro-am_michael", "supertonic-F1", "supertonic-M1"]
MODEL_PATH = PRIVATE / "r2-models/vosk-lgraph/vosk-model-en-us-0.22-lgraph"
LOCK = threading.Lock()
MODEL = None
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 600_000

spec = importlib.util.spec_from_file_location("speech_probe", DIRECTORY / "cloud/app.py")
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)


@app.before_request
def local_only():
    if request.host not in ["127.0.0.1:8765", "localhost:8765"]:
        abort(403)
    if request.method == "POST" and request.headers.get("Origin") not in [
        "http://127.0.0.1:8765", "http://localhost:8765",
    ]:
        abort(403)


@app.get("/")
def home():
    return send_file(DIRECTORY / "lab.html")


@app.get("/lab.js")
def javascript():
    return send_file(DIRECTORY / "lab.js", mimetype="text/javascript")


@app.get("/capture.js")
def capture():
    return send_file(DIRECTORY / "capture.js", mimetype="text/javascript")


@app.get("/audio/<voice>")
def audio(voice):
    if voice not in VOICES or not (LISTENING / (voice + ".wav")).exists():
        abort(404)
    return send_file(LISTENING / (voice + ".wav"), mimetype="audio/wav", conditional=True)


@app.get("/compression/<variant>")
def compressed_audio(variant):
    if variant not in ["32k", "48k"]:
        abort(404)
    return send_file(COMPRESSION / f"supertonic-F1-{variant}.mp3", mimetype="audio/mpeg", conditional=True)


@app.post("/compression-choice")
def compression_choice():
    data = request.get_json()
    if data.get("variant") not in ["32k", "48k", "original", "undecided"]:
        abort(400)
    choice = {"voice": "supertonic-F1", "variant": data["variant"],
              "chosen_at_utc": dt.datetime.now(dt.timezone.utc).isoformat()}
    (PRIVATE / "r2-compression-choice.json").write_text(json.dumps(choice, indent=2) + "\n")
    return jsonify(saved=True)


@app.post("/voice-choice")
def voice_choice():
    data = request.get_json()
    if data.get("voice") not in VOICES + ["none", "undecided"]:
        abort(400)
    choice = {"voice": data["voice"], "comment": str(data.get("comment", ""))[:1000],
              "chosen_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
              "compression": "comparison ready; awaiting owner choice" if data["voice"] == "supertonic-F1"
              else "not tested for this voice"}
    (PRIVATE / "r2-listening-choice.json").write_text(json.dumps(choice, indent=2) + "\n", encoding="utf-8")
    return jsonify(saved=True)


def input_audio():
    data = request.get_json()
    target = data.get("target", "")
    if not isinstance(target, str) or not re.fullmatch(r"[A-Za-z][A-Za-z' -]{0,79}", target):
        raise ValueError("Enter an English word or short phrase")
    pcm, duration = probe.decode_recording(data)
    return data, pcm, duration


@app.post("/recognize")
def recognize():
    global MODEL
    with LOCK:
        try:
            data, _, _ = input_audio()
            started = time.perf_counter()
            if MODEL is None:
                from vosk import Model, SetLogLevel
                SetLogLevel(-1)
                MODEL = Model(str(MODEL_PATH))
            probe.MODEL = MODEL
            result = probe.recognize(data)
            alternatives = result["segments"][0].get("alternatives", []) if len(result["segments"]) == 1 else []
            normalize = lambda text: re.sub(r"[^a-z0-9 ]", "", text.lower()).strip()
            matches = {str(k): any(normalize(item["text"]) == normalize(data["target"])
                                   for item in alternatives[:k]) for k in [1, 3, 5]}
            return jsonify(result=result, matches=matches, wall_ms=(time.perf_counter() - started) * 1000,
                           execution="local Vosk CPU; no OpenAI; no Vercel capacity claim")
        except Exception as error:
            return jsonify(error=type(error).__name__, message="识别未成功，请重录或通知我检查。技术失败不算读错。"), 422


@app.post("/save-sample")
def save_sample():
    with LOCK:
        try:
            data, _, _ = input_audio()
            if data.get("label") not in ["correct", "wrong", "invalid"] or data.get("human_confirmed") is not True:
                abort(400)
            raw = base64.b64decode(data["audio"], validate=True)
            digest = hashlib.sha256(raw).hexdigest()
            CORPUS.mkdir(exist_ok=True)
            manifest_path = CORPUS / "manifest.json"
            manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {"samples": []}
            duplicate = next((sample for sample in manifest["samples"]
                              if sample["sha256"] == digest and sample["target"] == data["target"]), None)
            if not duplicate:
                (CORPUS / (digest + ".wav")).write_bytes(raw)
                manifest["samples"].append({
                    "id": "sample-" + str(len(manifest["samples"]) + 1),
                    "file": digest + ".wav", "sha256": digest, "target": data["target"],
                    "label": data["label"], "human_confirmed": True,
                    "spoken_text": str(data.get("spoken_text", ""))[:100],
                    "control": bool(data.get("control", False)),
                })
                manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
            counts = {label: sum(sample["label"] == label and not sample["control"]
                                 for sample in manifest["samples"])
                      for label in ["correct", "wrong", "invalid"]}
            counts["control"] = sum(sample["control"] for sample in manifest["samples"])
            return jsonify(counts=counts)
        except (ValueError, KeyError):
            abort(400)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8765, debug=False, threaded=True)
