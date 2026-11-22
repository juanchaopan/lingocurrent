import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../..');
const privateRoot = path.join(root, '.ai-review-context');
const output = path.join(privateRoot, 'r2-output');
mkdirSync(output, { recursive: true });
const [command, ...args] = process.argv.slice(2);
const role = process.env.CI ? 'runner' : 'owner';
const keyPath = path.join(privateRoot, `r2-${role}-key.pem`);

function initialize() {
  if (existsSync(keyPath)) return;
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  writeFileSync(keyPath, privateKey.export({ format: 'pem', type: 'pkcs8' }), { mode: 0o600 });
  const publicValue = publicKey
    .export({ format: 'der', type: 'spki' })
    .subarray(-32)
    .toString('base64');
  if (role === 'owner') {
    writeFileSync(
      path.join(directory, 'owner-public-key.json'),
      JSON.stringify({ ed25519: publicValue }) + '\n',
    );
  } else {
    appendFileSync(process.env.GITHUB_ENV, `PROBE_RUNNER_PUBLIC_KEY=${publicValue}\n`);
  }
}

export async function invoke(url, payload, id) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.vercel.app')) {
    throw new Error('Use the reviewed HTTPS Vercel deployment URL.');
  }
  const body = JSON.stringify({ ...payload, timestamp: Date.now() / 1000 });
  const signature = sign(null, Buffer.from(body), readFileSync(keyPath)).toString('base64');
  appendFileSync(
    path.join(output, 'attempts.jsonl'),
    JSON.stringify({ id, state: 'pending', at: new Date().toISOString() }) + '\n',
  );
  const started = performance.now();
  const response = await fetch(new URL('/probe', parsed), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Probe-Signature': signature },
    body,
    signal: AbortSignal.timeout(295_000),
  });
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(
      `HTTP ${response.status}: probe unavailable or Vercel authentication required.`,
    );
  }
  const result = await response.json();
  const record = {
    id,
    http_status: response.status,
    client_wall_ms: performance.now() - started,
    ...result,
  };
  if (result.result?.audio) {
    const audio = Buffer.from(result.result.audio, 'base64');
    writeFileSync(path.join(output, id + '.wav'), audio);
    result.result.audio_sha256 = createHash('sha256').update(audio).digest('hex');
    result.result.audio_bytes = audio.length;
    delete result.result.audio;
  }
  writeFileSync(path.join(output, id + '.json'), JSON.stringify(record, null, 2) + '\n');
  appendFileSync(
    path.join(output, 'attempts.jsonl'),
    JSON.stringify({
      id,
      state: response.ok ? 'returned' : 'technical_failure',
      at: new Date().toISOString(),
      usage: result.result?.usage ?? result.result?.attempts ?? 'unknown',
    }) + '\n',
  );
  return record;
}

export function silentWav() {
  const pcm = Buffer.alloc(32_000);
  const header = Buffer.alloc(44);
  header.write('RIFF');
  header.writeUInt32LE(pcm.length + 36, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(16000, 24);
  header.writeUInt32LE(32000, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]).toString('base64');
}

const normalize = (text) =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

export function accepted(record, target, k) {
  if (record.http_status !== 200) return null;
  if (record.result.decision) {
    if (record.result.decision.verdict === 'uncertain') return null;
    return record.result.decision.verdict === 'match';
  }
  if (record.result.invalid) return false;
  const alternatives = record.result.segments[0]?.alternatives ?? [];
  return alternatives.slice(0, k).some((item) => normalize(item.text) === normalize(target));
}

async function corpus(url, engine, manifestPath) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const parent = path.dirname(path.resolve(manifestPath));
  const records = [];
  for (const sample of manifest.samples) {
    if (!sample.human_confirmed || !['correct', 'wrong', 'invalid'].includes(sample.label)) {
      throw new Error("Every sample needs the owner's confirmed audible label.");
    }
    const filename = path.resolve(parent, sample.file);
    if (!filename.startsWith(parent + path.sep))
      throw new Error('Sample path must stay in the private corpus directory.');
    const audio = readFileSync(filename).toString('base64');
    const record = await invoke(
      url,
      { mode: 'speak', audio, ...(engine === 'openai' ? { target: sample.target } : {}) },
      `${engine}-${sample.id}`,
    );
    records.push({
      id: sample.id,
      label: sample.label,
      control: Boolean(sample.control),
      accepts: Object.fromEntries([1, 3, 5].map((k) => [k, accepted(record, sample.target, k)])),
    });
  }
  const summary = summarize(records, engine);
  writeFileSync(
    path.join(output, `${engine}-quality-summary.json`),
    JSON.stringify(summary, null, 2) + '\n',
  );
  console.log(JSON.stringify(summary));
}

export function summarize(records, engine) {
  const summary = { engine, k: {} };
  for (const k of [1, 3, 5]) {
    const groups = Object.fromEntries(
      ['correct', 'wrong', 'invalid'].map((label) => [
        label,
        records.filter((item) => item.label === label && !item.control),
      ]),
    );
    const correct = groups.correct.filter((item) => item.accepts[k] === true).length;
    const rejected = groups.wrong.filter((item) => item.accepts[k] === false).length;
    const invalidAccepted = groups.invalid.filter((item) => item.accepts[k] === true).length;
    const technical = records.filter((item) => item.accepts[k] === null).length;
    const controls = records.filter((item) => item.control);
    summary.k[k] = {
      correct_accepted: correct,
      correct_total: groups.correct.length,
      wrong_rejected: rejected,
      wrong_total: groups.wrong.length,
      invalid_accepted: invalidAccepted,
      invalid_total: groups.invalid.length,
      technical,
      wrong_target_controls_accepted: controls.filter((item) => item.accepts[k] === true).length,
      wrong_target_controls_total: controls.length,
      initial_gate:
        technical === 0 &&
        groups.correct.length >= 10 &&
        groups.wrong.length >= 10 &&
        groups.invalid.length >= 3 &&
        correct / groups.correct.length >= 0.9 &&
        rejected / groups.wrong.length >= 0.9 &&
        invalidAccepted === 0 &&
        controls.length >= 3 &&
        controls.every((item) => item.accepts[k] === false),
    };
  }
  return summary;
}

async function smoke(url, engine) {
  if (engine.startsWith('vosk-')) {
    for (let index = 1; index <= 5; index++) {
      const result = await invoke(url, { audio: silentWav() }, `${engine}-silence-smoke-${index}`);
      if (result.http_status !== 200 || result.result.invalid !== 'no_speech')
        throw new Error('Silence smoke failed.');
    }
    console.log(
      'Five synthetic-silence requests completed. These are not owner quality or speech CPU capacity results.',
    );
  } else {
    const voices = engine === 'openai' ? ['marin', 'cedar'] : ['af_heart', 'am_michael'];
    for (const voice of voices) {
      const count = engine === 'openai' ? 3 : 1;
      const chunks = [];
      const timeline = [];
      let offset = 0;
      for (let sentenceIndex = 0; sentenceIndex < count; sentenceIndex++) {
        const id = `${engine}-${voice}${count > 1 ? `-${sentenceIndex}` : ''}`;
        const record = await invoke(url, { voice, sentence_index: sentenceIndex }, id);
        if (record.http_status !== 200)
          throw new Error('TTS demo request failed; inspect private attempt metadata.');
        if (count > 1) {
          const wav = readFileSync(path.join(output, id + '.wav'));
          chunks.push(wav.subarray(44));
          const duration = (wav.length - 44) / 48000;
          timeline.push({
            text: record.result.text,
            transcript: record.result.transcript,
            start: offset,
            end: offset + duration,
          });
          offset += duration;
        }
      }
      if (chunks.length) {
        const header = Buffer.from(
          readFileSync(path.join(output, `${engine}-${voice}-0.wav`)).subarray(0, 44),
        );
        const pcm = Buffer.concat(chunks);
        header.writeUInt32LE(pcm.length + 36, 4);
        header.writeUInt32LE(pcm.length, 40);
        writeFileSync(path.join(output, `${engine}-${voice}.wav`), Buffer.concat([header, pcm]));
        writeFileSync(
          path.join(output, `${engine}-${voice}-timeline.json`),
          JSON.stringify(timeline, null, 2) + '\n',
        );
      }
    }
    console.log(
      'Two original-text demos generated; fidelity, listening and cloud capacity still need review.',
    );
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (command === 'init') initialize();
  else if (command === 'smoke') await smoke(...args);
  else if (command === 'corpus') await corpus(...args);
  else
    throw new Error(
      'Commands: init | smoke <url> <engine> | corpus <url> <engine> <private-manifest.json>',
    );
}
