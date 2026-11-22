"""Prepare one isolated deployment, keeping downloaded weights out of Git."""

import argparse
import hashlib
import json
from pathlib import Path
import shutil
import urllib.request
import zipfile


ROOT = Path(__file__).resolve().parents[2]
CLOUD = Path(__file__).parent / "cloud"
CACHE = ROOT / ".ai-review-context" / "r2-models"
EVIDENCE = Path(__file__).parent / "evidence"
ENGINES = ["vosk-lgraph", "vosk-small", "kokoro", "openai", "openai-speak"]
MODELS = {
    "vosk-lgraph": "https://alphacephei.com/vosk/models/vosk-model-en-us-0.22-lgraph.zip",
    "vosk-small": "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip",
}
KOKORO_RELEASE = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/"


def download(url, filename, expected=None):
    path = CACHE / filename
    if not path.exists():
        urllib.request.urlretrieve(url, path)
    measured = hashlib.sha256(path.read_bytes()).hexdigest()
    if expected and expected != measured:
        raise ValueError("Model hash mismatch: " + filename)
    return path, {"url": url, "sha256": measured, "download_bytes": path.stat().st_size}


def extract_zip(path, destination):
    destination = destination.resolve()
    with zipfile.ZipFile(path) as archive:
        for member in archive.infolist():
            if not (destination / member.filename).resolve().is_relative_to(destination):
                raise ValueError("Unsafe archive member")
        archive.extractall(destination)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("engine", choices=ENGINES)
    args = parser.parse_args()
    CACHE.mkdir(parents=True, exist_ok=True)
    assets = CLOUD / "assets"
    # Only replace this experiment's generated asset directory, never a user path.
    if assets.exists():
        if assets.resolve().parent != CLOUD.resolve():
            raise ValueError("Unexpected asset directory")
        shutil.rmtree(assets)
    assets.mkdir()
    dependencies = ["Flask==3.1.3", "cryptography==50.0.2"]
    files = []
    if args.engine in MODELS:
        path, record = download(MODELS[args.engine], args.engine + ".zip")
        unpacked = CACHE / args.engine
        extract_zip(path, unpacked)
        directories = [item for item in unpacked.iterdir() if item.is_dir()]
        if len(directories) != 1:
            raise ValueError("Unexpected model archive layout")
        shutil.copytree(directories[0], assets / "vosk")
        files.append(record)
        dependencies.append("vosk==0.3.45")
    elif args.engine == "kokoro":
        for remote, local, sha in [
            ("kokoro-v1.0.int8.onnx", "kokoro.onnx", "ae315a79b623f244700e4afb9246c46a26066782e049ba174bf3ba433970ee9c"),
            ("voices-v1.0.bin", "voices.bin", "bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d"),
        ]:
            path, record = download(KOKORO_RELEASE + remote, remote, sha)
            shutil.copyfile(path, assets / local)
            files.append(record)
        dependencies += ["kokoro-onnx==0.6.1", "onnxruntime==1.32.0", "numpy==2.5.5"]
    else:
        dependencies.append("websocket-client==1.9.2")
    (CLOUD / "requirements.txt").write_text("\n".join(dependencies) + "\n", encoding="utf-8")
    size = sum(item.stat().st_size for item in assets.rglob("*") if item.is_file())
    record = {"engine": args.engine, "models": files, "assets_uncompressed_bytes": size,
              "dependencies": dependencies,
              "note": "Assets only. Actual built function and runtime memory remain separate gates."}
    EVIDENCE.mkdir(exist_ok=True)
    (EVIDENCE / (args.engine + "-preparation.json")).write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(record, indent=2))


if __name__ == "__main__":
    main()
