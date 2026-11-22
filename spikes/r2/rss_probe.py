"""Read-only feed/page comparison. Not a production article importer."""

import concurrent.futures
import datetime as dt
import hashlib
import json
from pathlib import Path
import re
import time
import unicodedata
import xml.etree.ElementTree as ET

from bs4 import BeautifulSoup
import httpx


ROOT = Path(__file__).resolve().parents[2]
PRIVATE = ROOT / ".ai-review-context" / "r2-rss"
OUTPUT = Path(__file__).parent / "evidence"
FEEDS = {
    "nasa-technology": "https://www.nasa.gov/technology/feed/",
    "nasa-aeronautics": "https://www.nasa.gov/aeronautics/feed/",
    "nasa-news-releases": "https://www.nasa.gov/news-release/feed/",
    "hackaday-technology": "https://hackaday.com/blog/feed/",
    "nih-research-matters": "https://www.nih.gov/nih-research-matters/feed.xml",
}
NS = {"content": "http://purl.org/rss/1.0/modules/content/"}
HEADERS = {"User-Agent": "LingoCurrent-RSS-evaluation/0.1 (read-only research)"}


def normalize(text):
    text = unicodedata.normalize("NFKC", text).translate(str.maketrans({
        "’": "'", "‘": "'", "“": '"', "”": '"', "\u00a0": " ",
    }))
    return re.sub(r"\s+", " ", text).strip()


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def blocks(html):
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "form", "aside", "figcaption"]):
        tag.decompose()
    return [normalize(p.get_text(" ", strip=True)) for p in soup.select("p, h2, h3, li")
            if normalize(p.get_text(" ", strip=True))]


def fetch(url, target):
    started = time.perf_counter()
    try:
        with httpx.Client(headers=HEADERS, timeout=25, follow_redirects=True) as client:
            response = client.get(url)
        target.write_text(response.text, encoding="utf-8")
        return {
            "requested_url": url, "final_url": str(response.url),
            "status": response.status_code, "bytes": len(response.content),
            "sha256": hashlib.sha256(response.content).hexdigest(),
            "content_type": response.headers.get("content-type"),
            "elapsed_ms": round((time.perf_counter() - started) * 1000),
        }, response.text
    except httpx.HTTPError as error:
        return {"requested_url": url, "error": type(error).__name__}, ""


def page_body(html, host):
    soup = BeautifulSoup(html, "html.parser")
    selectors = {
        "nasa": ".hds-wysiwyg, .entry-content",
        "hackaday": ".entry-content",
        "nih": ".field--name-body, .field-name-body, #main-content article",
    }
    key = next((key for key in selectors if key in host), None)
    matches = soup.select(selectors[key]) if key else []
    if not matches:
        matches = soup.select("article")
    body = max(matches, key=lambda node: len(node.get_text()), default=None)
    icons = [tag.get("href") for tag in soup.select('link[rel~="icon"]')]
    return blocks(str(body)) if body else [], selectors.get(key), icons


def compare_entry(channel, index, entry):
    url = entry.findtext("link")
    full = entry.findtext("content:encoded", namespaces=NS)
    description = entry.findtext("description") or ""
    field = "content:encoded" if full else "description"
    feed_blocks = blocks(full or description)
    feed_text = normalize(" ".join(feed_blocks))
    (PRIVATE / f"{channel}-{index}-feed.txt").write_text("\n\n".join(feed_blocks), encoding="utf-8")
    result, html = fetch(url, PRIVATE / f"{channel}-{index}-page.html")
    page_blocks, selector, icons = page_body(html, url)
    page_text = normalize(" ".join(page_blocks))
    (PRIVATE / f"{channel}-{index}-page.txt").write_text("\n\n".join(page_blocks), encoding="utf-8")
    matched = sum(1 for paragraph in feed_blocks if paragraph in page_text)
    last_paragraph = feed_blocks[-1] if feed_blocks else ""
    return {
        "title": entry.findtext("title"), "url": url,
        "guid": entry.findtext("guid"), "published": entry.findtext("pubDate"),
        "field": field, "feed_words": len(feed_text.split()),
        "page_words": len(page_text.split()), "feed_text_sha256": digest(feed_text),
        "page_text_sha256": digest(page_text), "feed_blocks": len(feed_blocks),
        "feed_blocks_found_on_page": matched,
        "feed_last_block_found_on_page": bool(last_paragraph and last_paragraph in page_text),
        "feed_last_block_sha256": digest(last_paragraph),
        "page_blocks_missing_from_feed": [
            {"sha256": digest(paragraph), "words": len(paragraph.split())}
            for paragraph in page_blocks if paragraph not in feed_text
        ],
        "page_selector": selector, "icons": icons,
        "page_request": result,
        "automated_verdict": "manual comparison required; metrics do not establish full text",
    }


def inspect_feed(channel, url):
    request, xml = fetch(url, PRIVATE / f"{channel}-feed.xml")
    result = {"channel": channel, "request": request, "samples": []}
    if request.get("status") != 200:
        return result
    try:
        root = ET.fromstring(xml)
    except ET.ParseError as error:
        result["parse_error"] = str(error)
        return result
    entries = root.findall("./channel/item")
    result["total_entries"] = len(entries)
    result["all_guids"] = [entry.findtext("guid") for entry in entries]
    result["all_links"] = [entry.findtext("link") for entry in entries]
    result["published_dates"] = [entry.findtext("pubDate") for entry in entries]
    result["feed_image"] = root.findtext("./channel/image/url")
    result["samples"] = [compare_entry(channel, index, entry)
                         for index, entry in enumerate(entries[:3], 1)]
    return result


def main():
    PRIVATE.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        futures = [pool.submit(inspect_feed, channel, url) for channel, url in FEEDS.items()]
        results = [future.result() for future in futures]
    overlaps = []
    for index, left in enumerate(results):
        for right in results[index + 1:]:
            shared = set(left.get("all_links", [])) & set(right.get("all_links", []))
            if shared:
                overlaps.append({"left": left["channel"], "right": right["channel"],
                                 "shared_links": sorted(shared)})
    report = {"checked_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
              "comparison": "NFKC, smart quotes, whitespace; image captions excluded",
              "overlap": overlaps, "feeds": results}
    (OUTPUT / "rss-measurements.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    for feed in results:
        print(feed["channel"], feed["request"].get("status", feed["request"].get("error")),
              [(entry["feed_words"], entry["page_words"]) for entry in feed["samples"]])


if __name__ == "__main__":
    main()
