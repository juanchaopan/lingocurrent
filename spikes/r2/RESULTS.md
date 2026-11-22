# R2 interim evidence — not a completed spike

RSS checked 2026-11-16; free listening round 2026-11-17, America/Toronto.
Issue #7 remains open. The owner selected sample C / Supertonic F1 for its voice.
The owner also accepted mono MP3 at 32 kbps. Production deployment/capacity,
source configuration remain undecided. The owner rejected the current
Vosk lgraph + Top-K Speak approach on 2026-11-21; its quality testing is stopped.

## Follow-up: other free recognizers screened (2026-11-21)

The owner clarified that rejecting one candidate must not end the whole Speak
comparison. The same five saved recordings were reused without another microphone
session, changing their labels, sending target hints to the decoder, or uploading
audio. The [sanitized receipt](evidence/free-asr-comparison.json) records versions,
the immutable Whisper model revision/hashes, hypotheses, exact-match counts and
single-run local timings. Complete private reports remain ignored locally.

| Target  | PocketSphinx 5.0.4 first hypothesis | Whisper base.en first transcript |
| ------- | ----------------------------------- | -------------------------------- |
| ship    | up to she                           | Shit.                            |
| avocado | how to cancun                       | Avocado                          |
| see     | fact sheet                          | See?                             |
| seed    | see you                             | C.D.                             |
| currant | collins                             | Cowerings                        |

PocketSphinx matched 0/5 targets at K=1/3/5; Whisper base.en matched 2/5 after the
same case/punctuation normalization. Whisper's API exposes one transcript, so
beam size five is **not** five available transcript candidates. Five derived
wrong-target controls were rejected by both; those reuse these same recordings
and are not independently spoken negative examples. One second of synthetic
silence produced `it` and `You` respectively, an additional warning against
treating arbitrary transcript text as reliable speech validation.

Neither tested configuration meets the owner's criterion. This is not a judgment
on every PocketSphinx or Whisper model/configuration. The owner can review these
actual outputs before any adoption decision; the prototype is not accepted.
Independent pronunciation correctness assessment remains unimplemented.

Sources: [PocketSphinx API](https://pocketsphinx.readthedocs.io/en/latest/pocketsphinx.html),
[faster-whisper CPU INT8 API](https://github.com/SYSTRAN/faster-whisper),
[base.en model](https://huggingface.co/Systran/faster-whisper-base.en).
PocketSphinx 5.1.1 had no compatible binary distribution in the local install;
the actual tested wheel is 5.0.4. Whisper used faster-whisper 1.2.1 / CTranslate2
4.9.0, CPU INT8, one thread, no VAD or target prompt. The 147,769,510 downloaded
Whisper model bytes are not a built Linux function size. No cloud/free-capacity
result is claimed.

Vosk small was the original resource fallback, not a measured quality improvement;
it remains untested. OpenAI raw-audio-plus-target judgment remains an unexecuted
paid fallback, separate from paid TTS. No paid call or cloud deployment occurred.
The original Vosk rejection remains in force; the Speak spike is not complete.

## Speak decision: current candidate rejected (2026-11-21)

After trying real recordings, the owner concluded that a word which the tool
cannot reliably recognize makes this approach unsuitable for the intended use,
and explicitly stopped further testing. Do not request the remainder of the
10/10/3 corpus for this candidate or treat that earlier sample gate as a reason
to continue. The reported `seed` and `currant` matching misses are preserved below.

Decision: **do not adopt the tested Vosk lgraph + strict Top-K text matching
prototype for this feature**. The page also lacks an independent pronunciation
correctness assessment. No recognition pass, pronunciation pass, quality rate or
cloud-capacity result is claimed. This is a rejection of the tested approach for
this product, not a measured assertion about every Vosk configuration or model.

Existing private samples and the experimental branch are preserved. At that point,
no further candidate test, paid call or deployment was started by that decision.
The subsequent free comparison above was requested by the owner. A replacement
Speak solution remains unselected. Supertonic F1 / mono MP3 32 kbps listening
acceptance remains separate and confirmed; #7 as a whole is not complete.

## Free original samples ready for owner listening

The owner clarified the order: compare free third-party libraries first; consider
paid OpenAI TTS only if those voices are unsatisfactory; test compression only
after choosing the voice. These real, same-text samples were generated locally:

| Sample | Free library / voice           | Duration | Native rate | Original file                                         |
| ------ | ------------------------------ | -------- | ----------- | ----------------------------------------------------- |
| A      | Kokoro ONNX 0.6.1 / af_heart   | 17.55 s  | 24 kHz      | [PCM16 WAV](evidence/listening/kokoro-af_heart.wav)   |
| B      | Kokoro ONNX 0.6.1 / am_michael | 19.57 s  | 24 kHz      | [PCM16 WAV](evidence/listening/kokoro-am_michael.wav) |
| C      | Supertonic 1.3.1 / F1          | 17.41 s  | 44.1 kHz    | [PCM16 WAV](evidence/listening/supertonic-F1.wav)     |
| D      | Supertonic 1.3.1 / M1          | 17.48 s  | 44.1 kHz    | [PCM16 WAV](evidence/listening/supertonic-M1.wav)     |

Those originals are uncompressed mono WAV at each engine's native rate. The owner
selected C in chat before the compression round below. Kokoro used INT8
model weights (model quantization, separate from audio-file compression); Supertonic
used the archived, hash-verified Supertonic 3 weights. Each WAV has a JSON receipt
with original text, version, parameters, local timings, size and SHA-256. Local CPU
timings are neither Vercel measurements nor an adoption recommendation.

The loopback lab at <http://127.0.0.1:8765> plays these four files and records the
owner's selection without choosing automatically. It also provides real microphone
capture, playback, local Vosk lgraph recognition, target matching at K=1/3/5, and
explicit human labeling. Recordings remain private and untracked. Browser QA used
a synthetic microphone only and saved no owner corpus or voice preference. All
four audio files load; mobile layout and recording/playback/recognition were checked.

The full planned recording corpus was not collected before the owner rejected
this Speak candidate. Actual Vercel evidence and final source selection remain
unfinished. Voice and compression listening choices
are confirmed.
No OpenAI model call or cloud probe deployment has occurred.

### Recorder loading fix (2026-11-21)

The owner's embedded browser failed to load `/capture.js` through the worklet
loader before recording started. The processor now ships inside `lab.js` and is
loaded from a temporary Blob URL; there is no separate worklet network request.
Failed starts close the microphone tracks and AudioContext and permit retry.

The browser regression test blocks the old external module URL, injects one
initialization failure, checks cleanup/retry, and validates captured mono 16 kHz
PCM16 WAV. A separate synthetic-microphone run against the real loopback Flask
server completed recording, playback and local Vosk recognition. These synthetic
runs saved no owner samples and do not establish recognition or pronunciation
quality. The embedded page was refreshed, the owner subsequently tried real
recordings, and the rejection above ends this candidate's testing.

### Human labels and model matching are separate

The owner reported `seed` returning `the cd`, `the seed`, `the scene`, `the seedy`,
`the seat`; another target `currant` returned `current`, `curried`, `courage`,
`koreans`, `currents`. Both missed the strict whole-candidate spelling match at
K=1/3/5. These observations are not recognition passes. The second also shows
why spelling mismatch must not be presented as a pronunciation error.

The former “读对” saved counter counted **human labels** (the owner says they read
the target), not model successes. The UI now names those counts as human-labeled
target/other/invalid samples and explicitly separates them from model matching.
No existing human labels or match rules were changed. A browser regression uses
the reported `seed` candidates to verify that saving a target-word label leaves
all three model misses visible. This experiment has no independent pronunciation
correctness assessment yet; transcription/Top-K matches do not establish it.

## Selected C compression comparison (2026-11-17)

The [owner's selection](evidence/listening/voice-choice.json) is Supertonic F1.
These variants encode that exact original without generating new speech:

| Variant            | File bytes | Reduction from original | Listen                                                |
| ------------------ | ---------- | ----------------------- | ----------------------------------------------------- |
| Original PCM16 WAV | 1,536,044  | —                       | [Original](evidence/listening/supertonic-F1.wav)      |
| Mono MP3, 32 kbps  | 70,025     | 95.44%                  | [32 kbps](evidence/compression/supertonic-F1-32k.mp3) |
| Mono MP3, 48 kbps  | 104,925    | 93.17%                  | [48 kbps](evidence/compression/supertonic-F1-48k.mp3) |

Both variants retain the 44.1 kHz native sample rate. FFmpeg gapless decoding
returns exactly the original's 768,000 mono frames for each. MP3 container padding
and browser playback timing are separate considerations; this is not full timeline
or device compatibility certification. The [receipt](evidence/compression/measurements.json)
records encoder/version, reproducible commands, sizes, SHA-256 and per-encode wall
time. The two single encodes are observations, not a latency distribution or cloud
benchmark. After listening, the owner explicitly chose **32 kbps** in chat; the
[selection receipt](evidence/compression/owner-choice.json) records that choice.
This confirms sample listening acceptance, not Vercel suitability or every-device
playback/timeline behavior.

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
  from the original model author. The owner chose Supertonic F1 after the
  `af_heart` / `am_michael` comparison. Actual package size, native dependencies and Hobby behavior
  still need the isolated deployment.
- Supertonic 3's four ONNX weights total 398,075,273 bytes before dependencies.
  The [author's repository](https://github.com/supertone-oss-archive/supertonic)
  is archived and says development/support ended. Its archived weights remain
  available under their own OpenRAIL-M license. This creates maintenance and
  ordinary-bundle pressure, but does **not** prove that every deployment strategy
  is impossible. Its free local voices are now included for owner listening;
  deployment and adoption remain undecided.
- [OpenAI's current TTS guide](https://developers.openai.com/api/docs/guides/text-to-speech)
  confirms the old Speech API models shut down January 6, 2027. The prepared
  reference uses the current Realtime workflow, with `marin` and `cedar`, rather
  than placing a Realtime model name into `/audio/speech`. Account/model access,
  fidelity, actual usage and costs remain untested. An optional fallback run makes six
  sentence-level calls, each with its own pending/result record and no automatic
  retry. The owner requires free voices first; no paid fallback is authorized or run.
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
The default run removes the probe after smoke measurements. An explicit
`keep_deployment` option retains the signed endpoint for private local owner
samples; the manual cleanup operation removes that exact deployment afterward.

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

The owner provided the free voice choice. Still obtain private,
human-labeled 10 correct + 10 wrong + 3 invalid recordings, with wrong-target
controls. Do not make cloud deployment a prerequisite for listening to local free
samples. The prepared corpus runner reports K=1/3/5 separately and refuses an
initial pass when samples are missing, technical failures remain, invalid samples
are accepted or a wrong-target control passes. Real recordings are never uploaded
to public GitHub artifacts. A voice/engine recommendation and results-only main
PR follow these gates; this report is not that final decision.
