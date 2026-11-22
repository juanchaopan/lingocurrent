# R2: speech and full-text feed validation (#7)

Status: in progress. Experimental code stays on `codex/spike-7-validation`;
only conclusions and selected evidence may reach main through a reviewed PR.
Keep this branch after the experiment, as requested by the owner.

## Speak stop decision (2026-11-21)

The owner rejected the tested Vosk lgraph + Top-K text matching prototype after
real word recordings and instructed us to stop testing. The candidate is not
adopted. The earlier 10/10/3 collection and 9/10 acceptance plan below is historical
for this candidate, not an outstanding request to the owner. Keep the recorded
misses and private recordings as evidence; no replacement or paid run is selected
or started. Independent pronunciation assessment was not implemented. TTS's
Supertonic F1 / MP3 32 kbps listening choice is retained. Other #7 work remains open.

## Owner's execution order (2026-11-17)

1. Generate native, uncompressed listening samples from different **free third-party
   libraries** first. The owner listens and participates in selection.
2. Test audio compression only after a voice is selected, to evaluate S3 space
   savings against that selected original. The owner selected C / Supertonic F1
   on November 17; its 32/48 kbps mono MP3 comparisons are now ready for listening.
3. Paid OpenAI TTS is a fallback **only if the owner finds the free options
   unsatisfactory**, with separate authorization then. Do not run it as an initial
   reference or assume the earlier cloud-run question was approved.
4. Speak also requires the owner's real word/phrase recordings. Synthetic smoke
   checks and CI cannot complete the quality gate or replace participation.

Four real free samples and the local microphone lab are available. The owner
selected Supertonic F1 and mono MP3 32 kbps, and rejected the current Speak
candidate after participating. Deployment fit and the rest of the spike remain
unfinished; do not resume this candidate's sample collection.

## Questions and gates

- RSS: do the five saved feeds contain complete English article text? Compare
  three entries per feed against the publisher's page, including the ending,
  stable identifiers, overlap, image/icon provenance, cadence, and reuse terms.
  Page requests are evidence collection, not a proposed scraping ingestion path.
  Resolve the saved Fashion/Style feed gap without repeating the source survey.
- TTS: compare the same original text across at most three engine options,
  producing 3–4 playable demos, sentence boundaries, usage, and mono compression
  comparisons. The owner chooses the voice. Local results do not prove Vercel fit.
- Speak: Vosk lgraph first, small if needed, then an OpenAI raw-audio comparison.
  Actual Vercel Hobby deployment and repeated cold/warm CPU, wall-time and memory
  observations are required. Test the owner's 10 correct, 10 incorrect and at
  least 3 invalid recordings, plus wrong-target controls. No target-only grammar.
  Report K=1/3/5 separately; >=9/10 correct accepted, >=9/10 wrong rejected,
  invalid recordings never accepted. These are sample-specific initial gates.

## Time and resource bounds

Use the existing plan: RSS one hour; TTS two hours and at most two listening
rounds; Speak two hours of experiment work. Waiting for owner recordings or
approval is recorded separately. Stop an unsuccessful candidate with evidence.
No paid infrastructure, subscription upgrades, extra server, production DB
changes or source ingestion. Cloud API usage must be measured per attempt.

For capacity, report 30,000 Speak calls/month under explicit cold-start ratios.
Use 2 of the documented 4 Hobby active CPU hours as an initial allocation to
Speak, reserving the other half for the website/TTS. This is an evaluation
assumption, not a product quota or an agreed production allocation. Platform
Usage and process CPU are different measurements; missing Usage is a gap.

## Execution and delivery

1. Reuse the exact feed URLs from `docs/product/channel-candidates.md`.
2. Run the read-only probe; inspect article paragraphs and endings manually.
3. Prepare isolated speech code and a reproducible cloud runner. Review the exact
   head before allowing it to receive secrets (ADR-0012 / issue #7).
4. Owner recordings remain private and untracked; do not commit raw recordings.
5. Publish code to this branch, without auto-merge. A separate results-only PR
   records measured outcomes, unknowns, and owner choices. Keep #7 open while
   required quality/deployment evidence is missing.

## Running the RSS probe (PowerShell)

```powershell
$env:UV_CACHE_DIR = Join-Path $PWD '.ai-review-context/uv-cache'
$env:UV_PYTHON_INSTALL_DIR = Join-Path $PWD '.ai-review-context/python'
$env:PYTHONUTF8 = '1'
uv run --python 3.12 --with beautifulsoup4==4.14.3 --with httpx==0.28.1 python spikes/r2/rss_probe.py
```

Full fetched pages and text stay in ignored local evidence. Committable JSON
contains metrics, hashes, URLs and brief diagnostic fields, not full articles.

This Windows session could not complete uv's directory renames. The actual probe
used official CPython 3.12.10's isolated embeddable runtime under ignored
`.ai-review-context/python-embed`, with hash-checked PyPI wheels for the same
BeautifulSoup/httpx versions. No global Python installation was changed.

## Review and run

Start with the local listening/recording page:

```powershell
$env:PYTHONUTF8 = '1'
.ai-review-context/python-embed/python.exe spikes/r2/local_lab.py
```

Open <http://127.0.0.1:8765>. The four original WAV files live in
`spikes/r2/evidence/listening/`. The page records the owner's voice choice locally,
and only starts microphone capture on a click. Recognizer requests and optional
human-labeled recordings stay on this computer. No paid/cloud API is involved.
Sample generation is reproducible with `listening.py kokoro` and
`listening.py supertonic`; `download_supertonic.py` fetches and verifies the archived
free weights. The local model directories and runtime stay ignored.

`compress_selected.py` encodes the chosen original at 32/48 kbps mono MP3, retaining
44.1 kHz. Its receipt records file sizes, encoder wall time, hashes and decoded
frame counts. The local page offers original/32/48 kbps listening and an explicit
compression choice. The owner explicitly accepted 32 kbps after this comparison;
the selection is preserved in `evidence/compression/owner-choice.json`.

Read [interim results](RESULTS.md) before approval. The branch's
`.github/workflows/deploy.yml` is an **experimental replacement**, not a main
pipeline change, and must never be merged. After owner review of an exact SHA,
successful PR CI, and temporary staging branch permission:

```powershell
gh workflow run deploy.yml --ref codex/spike-7-validation -f approved_sha=<reviewed-sha> -f engine=vosk-lgraph
```

Cloud fit/capacity validation follows the owner's listening participation.
Do not run `openai` before the owner rejects free voices and authorizes the paid
fallback. That optional runner makes two voices/six billable sentence calls.
Use `vosk-small` only if the lgraph candidate needs a smaller alternative.
The workflow uploads only fixed-text demos and smoke metrics and removes its
temporary deployment afterward. An attempted cloud dispatch was rejected by
automatic approval before execution; no branch policy changed, deployment ran,
or paid model call occurred. The owner then reaffirmed the free-first order above.

For the owner's private corpus, dispatch with `-f keep_deployment=true` and keep
the returned signed endpoint only for that test window. After local corpus runs,
dispatch the same reviewed SHA with `-f operation=cleanup -f cleanup_url=<exact-url>`
and the same engine. Cleanup checks the project, SHA and nonproduction target.
Do not leave a retained probe running after the experiment.

Local independent checks:

```powershell
node --test spikes/r2/runner.test.mjs
.ai-review-context/python-embed/python.exe -m unittest discover -s spikes/r2/cloud -p test_auth.py -v
```

The cloud workflow runs the Python boundary tests in Linux with its pinned
dependencies. Baseline app checks still follow CLAUDE.md. Private owner-corpus
execution is separate from the public synthetic smoke artifacts:

```powershell
node spikes/r2/runner.mjs corpus <approved-probe-url> vosk-lgraph .ai-review-context/private-corpus/manifest.json
```

Each manifest sample needs an ID, relative WAV filename, target, label
(`correct`/`wrong`/`invalid`), and `human_confirmed: true`. Wrong-target controls
reuse recordings with a deliberately different target and `control: true`.
Recordings must be 16 kHz mono PCM16 WAV, 0.2–10 seconds, and stay private.
