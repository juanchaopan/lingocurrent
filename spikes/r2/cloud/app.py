"""Isolated speech measurements; never a production application module."""

import base64
from contextlib import closing
import io
import json
import os
from pathlib import Path
import platform
import re
import threading
import time
import uuid
import wave

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from flask import Flask, jsonify, request


app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 1_500_000
ROOT = Path(__file__).parent
ENGINE = os.environ.get("PROBE_ENGINE", "unset")
INSTANCE = uuid.uuid4().hex
LOCK = threading.Lock()
MODEL = None
SENTENCES = [
    "On Wednesday, NASA tested a small aircraft above the coast.",
    "Dr. Lee checked the results at 4:45 p.m., then compared all 23 samples.",
    "The new system costs $12.50 per unit, but careful testing matters more than speed.",
]


@app.before_request
def authenticate():
    if request.method != "POST" or request.path != "/probe":
        return jsonify(error="not_found"), 404
    body = request.get_data()
    try:
        signature = base64.b64decode(request.headers.get("X-Probe-Signature", ""), validate=True)
        payload = json.loads(body)
        if abs(time.time() - float(payload["timestamp"])) > 60:
            return jsonify(error="expired_request"), 401
        for name in ["PROBE_OWNER_PUBLIC_KEY", "PROBE_RUNNER_PUBLIC_KEY"]:
            key = os.environ.get(name)
            if not key:
                continue
            try:
                Ed25519PublicKey.from_public_bytes(base64.b64decode(key, validate=True)).verify(signature, body)
                return None
            except InvalidSignature:
                continue
    except (ValueError, KeyError, TypeError):
        pass
    return jsonify(error="unauthorized"), 401


def wav_bytes(pcm, rate):
    output = io.BytesIO()
    with wave.open(output, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(rate)
        audio.writeframes(pcm)
    return output.getvalue()


def decode_recording(payload):
    raw = base64.b64decode(payload["audio"], validate=True)
    with wave.open(io.BytesIO(raw), "rb") as audio:
        if audio.getnchannels() != 1 or audio.getsampwidth() != 2 or audio.getframerate() != 16000:
            raise ValueError("Expected 16kHz mono PCM16 WAV")
        duration = audio.getnframes() / audio.getframerate()
        if not 0.2 <= duration <= 10:
            raise ValueError("Recording must last 0.2–10 seconds")
        return audio.readframes(audio.getnframes()), duration


def load_model():
    global MODEL
    if MODEL is not None:
        return False
    if ENGINE.startswith("vosk-"):
        from vosk import Model, SetLogLevel
        SetLogLevel(-1)
        MODEL = Model(str(ROOT / "assets" / "vosk"))
    elif ENGINE == "kokoro":
        from kokoro_onnx import Kokoro
        MODEL = Kokoro(str(ROOT / "assets" / "kokoro.onnx"), str(ROOT / "assets" / "voices.bin"))
    elif ENGINE not in ["openai", "openai-speak"]:
        raise ValueError("Unknown engine")
    else:
        MODEL = True
    return True


def recognize(payload):
    from vosk import KaldiRecognizer
    pcm, duration = decode_recording(payload)
    recognizer = KaldiRecognizer(MODEL, 16000)
    recognizer.SetMaxAlternatives(5)
    recognizer.SetWords(True)
    segments = []
    for offset in range(0, len(pcm), 8000):
        if recognizer.AcceptWaveform(pcm[offset:offset + 8000]):
            segments.append(json.loads(recognizer.Result()))
    segments.append(json.loads(recognizer.FinalResult()))
    segments = [segment for segment in segments
                if any(item.get("text") for item in segment.get("alternatives", []))]
    return {"duration_seconds": duration, "segments": segments,
            "invalid": "no_speech" if not segments else "multiple_segments" if len(segments) > 1 else None,
            "score_note": "Vosk raw path scores are not calibrated probabilities."}


def synthesize_kokoro(payload):
    import numpy as np
    voice = payload.get("voice", "af_heart")
    if voice not in ["af_heart", "am_michael"]:
        raise ValueError("Voice is outside this experiment")
    timeline, chunks, frame = [], [], 0
    for sentence in SENTENCES:
        samples, rate = MODEL.create(sentence, voice=voice, speed=1.0, lang="en-us")
        samples = np.asarray(samples)
        timeline.append({"text": sentence, "start": frame / rate, "end": (frame + len(samples)) / rate})
        chunks.append((np.clip(samples, -1, 1) * 32767).astype("<i2").tobytes())
        frame += len(samples)
    return {"voice": voice, "timeline": timeline, "sample_rate": rate,
            "audio": base64.b64encode(wav_bytes(b"".join(chunks), rate)).decode(),
            "mapping": "Each sentence is synthesized separately; offsets follow actual PCM frames."}


def realtime(content, instructions, voice=None):
    import websocket
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise ValueError("OpenAI credential not configured")
    model = "gpt-realtime-2.1"
    audio, text, transcript, usage = [], [], [], None
    with closing(websocket.create_connection(
        f"wss://api.openai.com/v1/realtime?model={model}",
        header=[f"Authorization: Bearer {key}"], timeout=90,
    )) as connection:
        connection.send(json.dumps({"type": "session.update", "session": {
            "type": "realtime", "model": model, "output_modalities": ["audio" if voice else "text"],
            "audio": {"input": {"format": {"type": "audio/pcm", "rate": 24000}, "turn_detection": None},
                      "output": {"format": {"type": "audio/pcm", "rate": 24000}, "voice": voice or "marin"}},
        }}))
        while True:
            event = json.loads(connection.recv())
            if event["type"] == "error":
                raise RuntimeError("Realtime session configuration failed")
            if event["type"] == "session.updated":
                break
        connection.send(json.dumps({"type": "response.create", "response": {
            "conversation": "none", "instructions": instructions,
            "input": [{"type": "message", "role": "user", "content": content}],
            "max_output_tokens": 3000 if voice else 512,
        }}))
        deadline = time.monotonic() + 100
        while time.monotonic() < deadline:
            event = json.loads(connection.recv())
            kind = event["type"]
            if kind == "error":
                raise RuntimeError("Realtime request failed; usage is unknown")
            if kind == "response.output_audio.delta":
                audio.append(base64.b64decode(event["delta"]))
            elif kind == "response.output_text.delta":
                text.append(event["delta"])
            elif kind == "response.output_audio_transcript.delta":
                transcript.append(event["delta"])
            elif kind == "response.done":
                usage = event["response"].get("usage")
                if event["response"]["status"] != "completed":
                    raise RuntimeError("Realtime response incomplete; usage requires reconciliation")
                return {"pcm": b"".join(audio), "text": "".join(text),
                        "transcript": "".join(transcript), "usage": usage, "model": model}
        raise TimeoutError("Realtime deadline; usage is unknown")


def openai_probe(payload):
    mode = payload.get("mode")
    if ENGINE == "openai-speak" and mode not in ["speak", "speak_transcribe"]:
        raise ValueError("This deployment permits audio assessment only")
    if mode in ["speak", "speak_transcribe"]:
        import audioop
        pcm, duration = decode_recording(payload)
        content = []
        if mode == "speak":
            target = payload.get("target", "")
            if not isinstance(target, str) or not re.fullmatch(r"[A-Za-z][A-Za-z' -]{0,79}", target):
                raise ValueError("Invalid target")
            instructions = (
                "Listen to the recording itself; the target is not evidence of what was said. "
                "Return only JSON with transcript (what you actually hear), verdict "
                "(match, different, invalid, or uncertain), pronunciation "
                "(acceptable, incorrect, invalid, or uncertain), and a short reason. "
                "Verdict concerns the entire audible word/phrase matching the target's sound; "
                "pronunciation concerns intelligible pronunciation of that target. "
                "Accept understandable accents and genuine homophones; do not use spelling "
                "alone as a pronunciation error. Reject near-sounding different words. "
                "Silence, noise-only and truncated words are invalid, not correct. "
                "Use uncertain if the audio cannot support a decision. Never produce a score."
            )
            content.append({"type": "input_text", "text": "Target: " + target})
        else:
            if "target" in payload:
                raise ValueError("Blind transcription must not receive a target")
            instructions = (
                "Transcribe exactly the audible English word or phrase. Do not invent words "
                "or add articles. Return only JSON with transcript (your best transcript) "
                "and candidates (up to five plausible alternative whole-word/phrase "
                "transcripts, ranked from most to least likely). The first candidate must "
                "equal transcript. Do not pad with implausible guesses. Use empty transcript "
                "and an empty list if no intelligible speech is audible. You are not given a target."
            )
        converted, _ = audioop.ratecv(pcm, 2, 1, 16000, 24000, None)
        content.insert(0, {"type": "input_audio", "audio": base64.b64encode(converted).decode()})
        result = realtime(content, instructions)
        decision = json.loads(result["text"])
        if not isinstance(decision.get("transcript"), str):
            raise ValueError("Invalid model decision")
        if mode == "speak_transcribe":
            candidates = decision.get("candidates")
            if (not isinstance(candidates, list) or len(candidates) > 5
                    or not all(isinstance(item, str) and item for item in candidates)
                    or (candidates[0] if candidates else "") != decision["transcript"]):
                raise ValueError("Invalid ranked candidate list")
        if mode == "speak" and (decision.get("verdict") not in ["match", "different", "invalid", "uncertain"]
                                or decision.get("pronunciation") not in ["acceptable", "incorrect", "invalid", "uncertain"]
                                or not isinstance(decision.get("reason"), str)):
            raise ValueError("Invalid audio judgment")
        return {"decision": decision, "usage": result["usage"], "model": result["model"],
                "duration_seconds": duration}
    voice = payload.get("voice", "marin")
    if voice not in ["marin", "cedar"]:
        raise ValueError("Voice is outside this experiment")
    index = payload.get("sentence_index")
    if type(index) is not int or index not in range(len(SENTENCES)):
        raise ValueError("Expected a fixed sentence index")
    sentence = SENTENCES[index]
    result = realtime([{"type": "input_text", "text": sentence}],
                      "Read the user's text verbatim, once, in natural clear English. "
                      "Do not add an introduction, explanation or conclusion.", voice)
    if not result["pcm"]:
        raise ValueError("No audio returned")
    return {"voice": voice, "sentence_index": index, "text": sentence,
            "transcript": result["transcript"], "sample_rate": 24000,
            "model": result["model"], "usage": result["usage"],
            "audio": base64.b64encode(wav_bytes(result["pcm"], 24000)).decode()}


def peak_memory():
    if platform.system() != "Linux":
        return None
    import resource
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss


@app.post("/probe")
def probe():
    with LOCK:
        start, cpu_start = time.perf_counter(), time.process_time()
        try:
            load_start = time.perf_counter()
            cold = load_model()
            load_ms = (time.perf_counter() - load_start) * 1000
            payload = request.get_json()
            if ENGINE.startswith("vosk-"):
                result = recognize(payload)
            elif ENGINE == "kokoro":
                result = synthesize_kokoro(payload)
            else:
                result = openai_probe(payload)
            return jsonify(engine=ENGINE, instance=INSTANCE, cold=cold, model_load_ms=load_ms,
                           wall_ms=(time.perf_counter() - start) * 1000,
                           process_cpu_ms=(time.process_time() - cpu_start) * 1000,
                           peak_rss_kib=peak_memory(),
                           runtime={"python": platform.python_version(), "machine": platform.machine(),
                                    "system": platform.system()}, result=result)
        except Exception as error:
            # Do not put model responses, recordings, authorization, or provider errors in logs.
            return jsonify(error=type(error).__name__, usage="unknown_if_provider_request_started"), 422
