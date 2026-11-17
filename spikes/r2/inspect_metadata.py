"""Collect primary-source package/model metadata, without loading model code."""

import datetime as dt
import json
from pathlib import Path
import urllib.request


OUTPUT = Path(__file__).parent / "evidence"


def get_json(url):
    request = urllib.request.Request(url, headers={"User-Agent": "LingoCurrent-spike/0.1"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response), response.url


def main():
    report = {"checked_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
              "packages": [], "models": [], "model_releases": []}
    for name in ["vosk", "kokoro-onnx", "supertonic", "onnxruntime", "numpy", "flask"]:
        data, url = get_json(f"https://pypi.org/pypi/{name}/json")
        wheels = [{"filename": item["filename"], "bytes": item["size"],
                   "sha256": item["digests"]["sha256"], "url": item["url"]}
                  for item in data["urls"] if item["filename"].endswith(".whl")
                  and ("manylinux" in item["filename"] or "py3-none-any" in item["filename"])]
        report["packages"].append({"name": name, "version": data["info"]["version"],
                                   "source": url, "requires_dist": data["info"]["requires_dist"],
                                   "wheels": wheels})
    for name in ["hexgrad/Kokoro-82M", "Supertone/supertonic-3",
                 "supertone-oss-archive/supertonic-3"]:
        try:
            metadata, url = get_json(f"https://huggingface.co/api/models/{name}")
            tree, tree_url = get_json(f"https://huggingface.co/api/models/{name}/tree/{metadata['sha']}?recursive=true")
            report["models"].append({"name": name, "revision": metadata["sha"], "source": url,
                                     "tree_source": tree_url, "files": tree})
        except urllib.error.HTTPError as error:
            report["models"].append({"name": name, "http_error": error.code})
    data, url = get_json("https://api.github.com/repos/thewh1teagle/kokoro-onnx/releases/tags/model-files-v1.1")
    report["model_releases"].append({"source": url, "tag": data["tag_name"],
                                     "assets": [{"name": item["name"], "bytes": item["size"],
                                                 "url": item["browser_download_url"],
                                                 "digest": item.get("digest")}
                                                for item in data["assets"]]})
    OUTPUT.mkdir(exist_ok=True)
    (OUTPUT / "candidate-metadata.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    for package in report["packages"]:
        print(package["name"], package["version"], package["requires_dist"])
    for model in report["models"]:
        print(model["name"], model.get("revision", model.get("http_error")),
              sum(item.get("size", 0) for item in model.get("files", []) if item.get("type") == "file"))


if __name__ == "__main__":
    main()
