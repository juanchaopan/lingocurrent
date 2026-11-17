"""Download the archived free model by its recorded immutable revision."""

from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
DESTINATION = ROOT / ".ai-review-context" / "r2-models" / "supertonic"
metadata = json.loads((Path(__file__).parent / "evidence/candidate-metadata.json").read_text())
model = next(item for item in metadata["models"] if item["name"] == "supertone-oss-archive/supertonic-3")


def download(item):
    target = DESTINATION / item["path"]
    target.parent.mkdir(parents=True, exist_ok=True)
    url = f"https://huggingface.co/{model['name']}/resolve/{model['revision']}/{item['path']}"
    if not target.exists() or target.stat().st_size != item["size"]:
        urllib.request.urlretrieve(url, target)
    sha = hashlib.sha256(target.read_bytes()).hexdigest()
    if item.get("lfs") and sha != item["lfs"]["oid"]:
        raise ValueError("Model digest mismatch: " + item["path"])
    if not item.get("lfs"):
        content = target.read_bytes()
        git_sha = hashlib.sha1(b"blob " + str(len(content)).encode() + b"\0" + content).hexdigest()
        if git_sha != item["oid"]:
            raise ValueError("Asset digest mismatch: " + item["path"])
    print(item["path"], target.stat().st_size, flush=True)
    return {"path": item["path"], "bytes": target.stat().st_size, "sha256": sha, "url": url}


files = [item for item in model["files"] if item["type"] == "file"
         and (item["path"].startswith("onnx/") or item["path"].startswith("voice_styles/"))]
with ThreadPoolExecutor(max_workers=3) as pool:
    result = list(pool.map(download, files))
(DESTINATION / "download-receipt.json").write_text(json.dumps({
    "repository": model["name"], "revision": model["revision"], "files": result,
}, indent=2) + "\n")
