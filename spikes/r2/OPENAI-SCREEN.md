# OpenAI raw-audio screening — 2026-11-22

Current quality-test transport: the permanent repository key mints one ten-minute
Realtime client credential, encrypted to a local-only RSA private identity.
GitHub publishes ciphertext only. The local client decrypts it in memory and
sends the same WAVs directly to OpenAI, preserving the 14-response/usage guards.
No recording or long-lived key is sent through GitHub artifacts. Vercel's failed
deployment is cleaned separately; it is not a prerequisite for this quality test.
See the [official client-secret API](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create).
The earlier signed-relay design below remains experimental deployment work, not
an executed model result or an instruction to disable failed deployment checks.

The owner explicitly requested an OpenAI trial after the free recognizers failed
the intended use. This run assesses the original recordings, not paid TTS.
Code remains on the isolated experiment branch; no main merge or production run.

## Scope

Reuse the five saved, human-labeled recordings for ship, avocado, see, seed and
currant. Preserve labels, check each WAV's SHA-256 locally and send no human label
or intended spoken-text annotation to the model. At most **14 paid responses**:

- Five blind transcripts: no target supplied.
- Five independent audio + target judgments, returning transcript, whole-target
  sound match, pronunciation opinion and a short explanation. Accept genuine
  homophones; a transcript's spelling alone is not a pronunciation error.
- Three near-word retargeted controls: ship → sheep, see → seed, seed → see.
- One second of synthetic silence with target seed. This is not an owner sample.

Each response uses a fresh, text-output-only `gpt-realtime-2.1` request with a
512-token output cap. There is no automatic retry. Any technical failure or
missing usage stops further calls. A private persistent attempt ledger prevents
accidental reruns. Model opinions are evidence to review, not calibrated scores
or a completed quality gate; true incorrect/truncated/noisy human clips are not
yet collected.

## Price and data path

[Official model pricing](https://developers.openai.com/api/docs/models/gpt-realtime-2.1)
lists audio input $32 / million tokens, text input $4 / million and text output
$24 / million. The client conservatively prices **all** input tokens at $32 and
ignores cache discounts, stopping before another call once cumulative upper
cost reaches $0.75. With these short recordings and capped outputs, the initial
screen is expected below US$1; actual provider usage is recorded per response.
This client guard is not an account-wide provider spending limit.

The API key is an existing GitHub Repository Secret; it is absent locally.
The existing manual workflow deploys an isolated `openai-speak` function to the
staging project's nonproduction target. It permits signed transcription/judgment
requests only, rejects TTS and makes **zero automatic model calls**. The local
client sends the WAV through this temporary Vercel function to OpenAI. Raw audio
and detailed results stay out of Git and GitHub Actions artifacts. Only the
deployment/build metadata is uploaded as a short-lived Actions artifact.

Current staging policy permits main only. Any temporary allowance must name just
`codex/spike-7-validation`, use the CI-validated head, preserve main's policy, and
be removed after the matching deployment is cleaned up. No general PR preview,
production policy, DB, Clerk or storage operation is needed. Do not disable
Vercel deployment protection if it prevents the signed requests.

## Run and cleanup

1. Pass local boundary/plan tests, actionlint and current-head CI; publish the
   concrete experiment head for review before it receives testing credentials.
2. `node spikes/r2/openai_screen.mjs plan` creates a private frozen plan.
3. Dispatch the existing `deploy.yml` workflow at that exact head with engine
   `openai-speak`, operation `run`, and `keep_deployment=true`.
4. Download its deployment metadata to the ignored local directory. Run
   `node spikes/r2/openai_screen.mjs execute <deployment.json>` exactly once.
5. Before changing the branch head, dispatch cleanup for that same SHA and exact
   URL, then remove only the temporary environment branch allowance. Preserve
   the original policy and raw recordings. Record successes, misses, uncertainty,
   technical failures and costs; obtain owner review before adoption.
