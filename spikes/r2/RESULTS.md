# R2 interim evidence — not a completed spike

Checked 2026-11-16, America/Toronto. Issue #7 remains open. No engine, voice,
source configuration or production capacity is approved by this report.

## RSS observations

The existing five candidate URLs were reused. The probe fetched each feed and
compared its first three entries with the publisher's article body. Raw captures
remain local and ignored; [measurements](evidence/rss-measurements.json) contain
URLs, request outcomes, hashes and paragraph counts. Normalization handles Unicode,
smart quotes and whitespace, and excludes image captions. This tests narrative
paragraphs, not image/video equivalence or future entries. Manual inspection
checked the unmatched blocks and endings; word count alone is not the verdict.

| Saved candidate      | HTTP / entries | Three feed → page word counts | Observed result                                                                                                                                                 |
| -------------------- | -------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NASA Technology      | 200 / 10       | 276→264, 468→419, 1117→980    | All sampled page narrative paragraphs present in feed; extra recommendation/navigation text requires removal.                                                   |
| NASA Aeronautics     | 200 / 10       | 645→572, 695→695, 407→379     | All sampled page narrative paragraphs present; recommendations and tags require removal.                                                                        |
| NASA News Releases   | 200 / 10       | 451→312, 170→158, 415→400     | Sampled narrative present, but feed is titled “NASA” and includes a Mars blog and a photojournal item. Do not treat it as a verified news-release-only channel. |
| Hackaday Blog        | 200 / 7        | 220→220, 186→186, 254→254     | Exact normalized paragraph matches, including endings, in all three samples. Reuse permission remains unresolved.                                               |
| NIH Research Matters | 403 / none     | No samples                    | Server-side request failed; no full-text verdict.                                                                                                               |

Each successful feed has nonempty GUIDs and links. NASA Technology and
Aeronautics share the same navigation-experiment article, so cross-channel
canonical-link deduplication matters. This observation does not settle the final
source-specific identity algorithm.

This snapshot spans October 14–November 4 for Technology, October 20–November 12
for Aeronautics, November 13–16 for the saved News Releases URL, and approximately
12 hours for Hackaday. Dates are in UTC in the raw metrics. These are feed windows,
not a measured long-term supply rate; they cannot support a fixed daily quota.
Sample bodies range from short captions to technical science articles, requiring
per-article length/topic filtering and no promise of uniform learner difficulty.

The [official NASA directory](https://www.nasa.gov/rss-feeds/) still advertises
the saved URLs. [Discovery checks](evidence/discovery-checks.json) preserve the
directory hash and links; the channel-scope mismatch is observed behavior rather
than a guessed replacement URL. Fashionista's direct homepage request returned 403. Its browser-readable homepage and targeted official-domain search did not
establish an advertised full-text Fashion/Style feed. That gap remains open;
no guessed URL or substitute scraping importer was introduced.

## Source conditions and icons

These are source-document observations, not a blanket rights determination:

- [NASA's guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)
  describe educational/informational use with acknowledgment, third-party
  exclusions and non-endorsement constraints. They focus heavily on media and
  do not establish unrestricted text/TTS rights for every mixed-origin entry.
  Verify article authorship/exceptions and the permitted source-icon treatment
  before enabling this source. NASA favicon URLs are recorded in the measurements.
- [Hackaday's terms](https://hackaday.io/tos) expressly cover hackaday.com and
  restrict copying, derivative works and republication except as stated. A
  working full-text RSS feed is insufficient evidence of permission to host text
  and generate distributed TTS. Do not enable without a suitable grant. The
  site's advertised favicon is recorded, but reuse is not approved.
- [NIH's FAQ](https://www.nih.gov/about-nih/frequently-asked-questions) describes
  most information as public domain with third-party exceptions and restricted
  logo use. Technical fetching still failed, so no source adoption follows.
- NASA and Hackaday robots files allow the tested public paths; NIH's robots file
  does not explain away the observed 403. Robots access and copyright permission
  are separate checks. No publisher was contacted.

No final import manifest is produced: source selection, icon permission,
Fashion/Style, timezone, collection times and per-time counts remain undecided.

## Speech candidate screening

[Registry/model metadata](evidence/candidate-metadata.json) records immutable
revisions and file sizes from the primary registries. It is static screening,
not inference or deployment evidence.

- Kokoro's ONNX INT8 release plus its voice table totals 142,333,725 bytes before
  runtime dependencies. The release advertises SHA-256 digests, checked by the
  preparation script. The ONNX implementation is a separate community project
  from the original model author. Compare `af_heart` and `am_michael`; neither is
  selected yet. Actual package size, native dependencies and Hobby behavior
  still need the isolated deployment.
- Supertonic 3's four ONNX weights total 398,075,273 bytes before dependencies.
  The [author's repository](https://github.com/supertone-oss-archive/supertonic)
  is archived and says development/support ended. Its archived weights remain
  available under their own OpenRAIL-M license. This creates maintenance and
  ordinary-bundle pressure, but does **not** prove that every deployment strategy
  is impossible. It is held as the third candidate rather than silently adopted.
- [OpenAI's current TTS guide](https://developers.openai.com/api/docs/guides/text-to-speech)
  confirms the old Speech API models shut down January 6, 2027. The prepared
  reference uses the current Realtime workflow, with `marin` and `cedar`, rather
  than placing a Realtime model name into `/audio/speech`. Account/model access,
  fidelity, actual usage and costs remain untested. The demo run makes six
  sentence-level calls, each with its own pending/result record and no automatic
  retry. No paid model calls have been made during this preparation.
- Vosk lgraph and small English models remain the ordered Speak candidates.
  Five synthetic silence requests in the prepared smoke runner test invocation
  and no-speech handling only; they cannot satisfy the owner's speech-quality
  gate or establish CPU consumption for real speech.

[Vercel's current limits](https://vercel.com/docs/functions/limitations) list
Hobby 2 GB memory, 300 seconds and a standard 500 MB Python bundle. The
[Hobby plan](https://vercel.com/docs/plans/hobby) lists 4 active CPU hours/month.
These are published limits. The actual account plan, built function bytes,
provider acceptance, model-cold/warm measurements, platform Usage and 30,000-call
capacity estimate have **not** been measured yet.

## Prepared cloud run and remaining gates

The experimental branch replaces `.github/workflows/deploy.yml` **on that branch
only** to use an already-registered manual workflow path. Never merge this file
into main. Main's deployment workflow is unchanged. The runner requires the owner,
the exact approved current SHA and successful CI before testing credentials.
It builds one isolated Flask function, uses the staging project without `--prod`,
and checks ownership/SHA/nonproduction target before cleanup. It does not use DB,
Clerk or storage credentials, and does not enable general PR previews.

Signed requests require an Ed25519 private key kept in ignored local files or an
ephemeral runner key. Only public keys reach the function. Request bodies and
provider errors are not logged. Test results do not imply the cloud runner has
executed successfully.

GitHub staging currently permits only `main` (read from the environment policy).
Before running this reviewed branch, temporarily allowing the exact spike branch
is necessary; production policy stays unchanged. A temporary nonproduction probe
deployment is also needed despite general PR previews remaining deferred. Both
actions await the owner's review of the concrete head. If Vercel deployment
protection blocks automated requests, report it without disabling protection.

After cloud feasibility/demos, obtain the owner's listening choice and private,
human-labeled 10 correct + 10 wrong + 3 invalid recordings, with wrong-target
controls. The prepared corpus runner reports K=1/3/5 separately and refuses an
initial pass when samples are missing, technical failures remain, invalid samples
are accepted or a wrong-target control passes. Real recordings are never uploaded
to public GitHub artifacts. A voice/engine recommendation and results-only main
PR follow these gates; this report is not that final decision.
