"""Short-lived encrypted Realtime credential; owner audio goes directly to OpenAI."""

import base64
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.request

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa

ROOT = Path(__file__).resolve().parents[2]
PRIVATE = ROOT / ".ai-review-context/r2-openai-screen"
PUBLIC = Path(__file__).with_name("openai-client-public.json")


def oaep():
    return padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=b"r2-openai-screen")


def initialize():
    PRIVATE.mkdir(parents=True, exist_ok=True)
    destination = PRIVATE / "client-private.pem"
    if destination.exists():
        raise ValueError("Keep the existing client identity; do not replace it")
    key = rsa.generate_private_key(public_exponent=65537, key_size=4096)
    destination.write_bytes(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                                             serialization.NoEncryption()))
    public_pem = key.public_key().public_bytes(serialization.Encoding.PEM,
                                              serialization.PublicFormat.SubjectPublicKeyInfo).decode()
    PUBLIC.write_text(json.dumps({"pem": public_pem}) + "\n", encoding="utf-8")
    print("Created local private identity and publishable encryption key.")


def mint():
    if os.environ.get("CI") != "true":
        raise ValueError("Mint through the reviewed workflow using the existing repository secret")
    payload = {"expires_after": {"anchor": "created_at", "seconds": 600},
               "session": {"type": "realtime", "model": "gpt-realtime-2.1",
                           "output_modalities": ["text"], "max_output_tokens": 512}}
    request = urllib.request.Request("https://api.openai.com/v1/realtime/client_secrets",
        data=json.dumps(payload).encode(), method="POST",
        headers={"Authorization": "Bearer " + os.environ["OPENAI_API_KEY"], "Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=30) as response:
        secret = json.load(response)
    if not isinstance(secret.get("value"), str) or not secret["value"].startswith("ek_"):
        raise ValueError("Expected a short-lived session credential, never the permanent API key")
    encrypted = {"value": secret["value"], "expires_at": secret["expires_at"], "sha": os.environ["GITHUB_SHA"]}
    public = serialization.load_pem_public_key(json.loads(PUBLIC.read_text(encoding="utf-8"))["pem"].encode())
    ciphertext = public.encrypt(json.dumps(encrypted).encode(), oaep())
    receipt = {"ciphertext": base64.b64encode(ciphertext).decode(), "expires_at": secret["expires_at"],
               "sha": os.environ["GITHUB_SHA"], "ttl_seconds": 600}
    output = ROOT / ".ai-review-context/r2-output"
    output.mkdir(parents=True, exist_ok=True)
    (output / "client-ticket.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print("Encrypted a ten-minute Realtime credential. No audio or model response requested.")


def cost_upper(usage):
    if not isinstance(usage, dict) or not all(type(usage.get(name)) is int and usage[name] >= 0 for name in ["input_tokens", "output_tokens"]):
        raise ValueError("Usage unavailable; stop without another charge")
    return (usage["input_tokens"] * 32 + usage["output_tokens"] * 24) / 1_000_000


def execution_cases(plan, ledger, recover):
    if not ledger.exists():
        if recover:
            raise ValueError("Recovery requires the preserved failed attempt")
        return plan["cases"]
    records = [json.loads(line) for line in ledger.read_text(encoding="utf-8").splitlines()]
    if not recover or len(records) != 2 or [row.get("state") for row in records] != ["pending", "failed_unreconciled"]:
        raise ValueError("An attempt exists. No automatic or repeated recovery")
    if any(row.get("id") != plan["cases"][0]["id"] for row in records):
        raise ValueError("Recovery does not match the first failed request")
    cases = [item for item in plan["cases"] if item["id"] != "control-seed-see"]
    if len(cases) != 13:
        raise ValueError("Recovery must preserve the original total of 14 attempts")
    return cases


def execute(ticket_path, recover=False):
    plan = json.loads((PRIVATE / "plan.json").read_text(encoding="utf-8"))
    sha = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    ticket = json.loads(Path(ticket_path).read_text(encoding="utf-8"))
    key = serialization.load_pem_private_key((PRIVATE / "client-private.pem").read_bytes(), password=None)
    secret = json.loads(key.decrypt(base64.b64decode(ticket["ciphertext"], validate=True), oaep()))
    if plan["sha"] != sha or secret["sha"] != sha or ticket["sha"] != sha or secret["expires_at"] <= time.time() + 30:
        raise ValueError("Use an unexpired credential and exact CI-validated plan head")
    if plan["max_calls"] != 14 or len(plan["cases"]) != 14:
        raise ValueError("Unexpected paid plan")
    ledger = PRIVATE / "attempts.jsonl"
    cases = execution_cases(plan, ledger, recover)
    if recover:
        with ledger.open("a", encoding="utf-8") as log:
            log.write(json.dumps({"state": "manual_recovery_started", "prior_attempts": 1,
                                  "remaining_max": 13, "prior_usage": "unknown"}) + "\n")
    # This is a short-lived Realtime credential, not the permanent repository key.
    os.environ["OPENAI_API_KEY"] = secret["value"]
    os.environ["PROBE_ENGINE"] = "openai-speak"
    sys.path.insert(0, str(ROOT / ".ai-review-context/r2-openai-runtime"))
    spec = importlib.util.spec_from_file_location("direct_audio_probe", ROOT / "spikes/r2/cloud/app.py")
    probe = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(probe)
    spent, results = 0, []
    corpus = (ROOT / ".ai-review-context/r2-owner-corpus").resolve()
    try:
        for item in cases:
            if spent >= 0.75:
                raise ValueError("Conservative spending stop reached")
            if item.get("sample"):
                filename = (corpus / item["sample"]["file"]).resolve()
                if not filename.is_relative_to(corpus):
                    raise ValueError("Recording outside private corpus")
                raw = filename.read_bytes()
                if hashlib.sha256(raw).hexdigest() != item["sample"]["sha256"]:
                    raise ValueError("Recording changed")
            else:
                raw = probe.wav_bytes(bytes(32000), 16000)
            payload = {"mode": item["mode"], "audio": base64.b64encode(raw).decode()}
            if item["mode"] == "speak":
                payload["target"] = item["target"]
            with ledger.open("a", encoding="utf-8") as log:
                log.write(json.dumps({"id": item["id"], "state": "pending"}) + "\n")
            started = time.perf_counter()
            try:
                response = probe.openai_probe(payload)
            except Exception as error:
                diagnostic = getattr(error, "diagnostic", {"exception": type(error).__name__, "usage": None})
                with ledger.open("a", encoding="utf-8") as log:
                    log.write(json.dumps({"id": item["id"], "state": "failed", "diagnostic": diagnostic}) + "\n")
                print("Stopped diagnostic: " + json.dumps(diagnostic), flush=True)
                raise
            spent += cost_upper(response["usage"])
            results.append({"id": item["id"], "target": item.get("target", item.get("sample", {}).get("target")),
                            "expected": item["expected"], "decision": response["decision"], "usage": response["usage"],
                            "wall_ms": (time.perf_counter() - started) * 1000})
            (PRIVATE / "results.json").write_text(json.dumps({"sha": sha, "model": response["model"],
                "conservative_upper_usd": spent, "complete": len(results) == len(cases), "results": results,
                "planned_responses": len(cases), "prior_attempt_usage": "unknown" if recover else "none",
                "note": "Same recordings sent directly to OpenAI; judgments are model opinions, not calibrated scores."},
                indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            with ledger.open("a", encoding="utf-8") as log:
                log.write(json.dumps({"id": item["id"], "state": "returned", "upper_usd": spent}) + "\n")
            print(f"Completed {len(results)}/{len(cases)}; known responses conservative USD {spent:.4f}", flush=True)
    finally:
        os.environ.pop("OPENAI_API_KEY", None)


if __name__ == "__main__":
    try:
        if sys.argv[1:] == ["init"]:
            initialize()
        elif sys.argv[1:] == ["mint"]:
            mint()
        elif len(sys.argv) == 3 and sys.argv[1] == "execute":
            execute(sys.argv[2])
        elif len(sys.argv) == 3 and sys.argv[1] == "recover":
            execute(sys.argv[2], recover=True)
        else:
            raise ValueError("Commands: init | mint | execute <encrypted-ticket.json>")
    except Exception as error:
        # Provider responses and credential values are never console diagnostics.
        status = getattr(error, "code", getattr(error, "status_code", None))
        print("Stopped without retry: " + type(error).__name__ +
              (f" HTTP {status}" if isinstance(status, int) else ""), file=sys.stderr)
        sys.exit(1)
