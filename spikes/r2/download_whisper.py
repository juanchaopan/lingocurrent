"""Download a pinned public CTranslate2 model without loading remote Python code."""

import hashlib
import json
from pathlib import Path
import shutil
import urllib.request

PRIVATE = Path(__file__).resolve().parents[2] / ".ai-review-context"
REPOSITORY = "Systran/faster-whisper-base.en"
REVISION = "3d3d5dee26484f91867d81cb899cfcf72b96be6c"
FILES = ["config.json", "model.bin", "tokenizer.json", "vocabulary.txt"]


def main():
    url = f"https://huggingface.co/api/models/{REPOSITORY}/revision/{REVISION}?blobs=true"
    with urllib.request.urlopen(url, timeout=30) as response:
        metadata = json.load(response)
    revision = metadata["sha"]
    if revision != REVISION:
        raise ValueError("Unexpected model revision")
    directory = PRIVATE / "r2-models/faster-whisper-base.en" / revision
    directory.mkdir(parents=True, exist_ok=True)
    entries = {item["rfilename"]: item for item in metadata["siblings"]}
    receipt = {"repository": REPOSITORY, "revision": revision, "files": []}
    for filename in FILES:
        destination = directory / filename
        expected = entries[filename].get("lfs", {}).get("sha256")
        if not destination.exists():
            temporary = destination.with_suffix(destination.suffix + ".partial")
            with urllib.request.urlopen(f"https://huggingface.co/{REPOSITORY}/resolve/{revision}/{filename}", timeout=60) as response:
                with temporary.open("wb") as output:
                    shutil.copyfileobj(response, output)
            temporary.replace(destination)
        digest = hashlib.sha256(destination.read_bytes()).hexdigest()
        if expected and digest != expected:
            raise ValueError("Model hash mismatch")
        receipt["files"].append({"file": filename, "bytes": destination.stat().st_size,
                                 "sha256": digest, "expected_lfs_sha256": expected})
    (directory / "download-receipt.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(str(directory))


if __name__ == "__main__":
    main()
