import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { invoke, silentWav } from './runner.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const corpus = path.join(root, '.ai-review-context/r2-owner-corpus');
const output = path.join(root, '.ai-review-context/r2-openai-screen');
const targets = ['ship', 'avocado', 'see', 'seed', 'currant'];

export function buildPlan(manifest) {
  const samples = targets.map((target) => {
    const sample = manifest.samples.find((item) => item.target === target && !item.control);
    if (!sample?.human_confirmed || sample.label !== 'correct')
      throw new Error('Five explicitly labeled benchmark recordings are required.');
    return sample;
  });
  const cases = samples.flatMap((sample) => [
    { id: `${sample.id}-blind`, mode: 'speak_transcribe', sample, expected: 'transcript' },
    { id: `${sample.id}-target`, mode: 'speak', sample, target: sample.target, expected: 'match' },
  ]);
  for (const [spoken, target] of [
    ['ship', 'sheep'],
    ['see', 'seed'],
    ['seed', 'see'],
  ]) {
    cases.push({
      id: `control-${spoken}-${target}`,
      mode: 'speak',
      sample: samples.find((sample) => sample.target === spoken),
      target,
      expected: 'different',
    });
  }
  cases.push({ id: 'synthetic-silence', mode: 'speak', target: 'seed', expected: 'invalid' });
  return cases;
}

export function payloadFor(item, audio) {
  return { mode: item.mode, audio, ...(item.mode === 'speak' ? { target: item.target } : {}) };
}

export function upperCost(usage) {
  if (
    !Number.isInteger(usage?.input_tokens) ||
    usage.input_tokens < 0 ||
    !Number.isInteger(usage?.output_tokens) ||
    usage.output_tokens < 0
  )
    throw new Error('Usage unavailable; stop before any further paid call.');
  // Conservatively price every input token at the higher audio rate, ignoring cache discounts.
  return (usage.input_tokens * 32 + usage.output_tokens * 24) / 1_000_000;
}

function head() {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
}

function audioFor(item) {
  if (!item.sample) return silentWav();
  const filename = path.resolve(corpus, item.sample.file);
  if (!filename.startsWith(corpus + path.sep)) throw new Error('Recording must stay in corpus.');
  const bytes = readFileSync(filename);
  if (createHash('sha256').update(bytes).digest('hex') !== item.sample.sha256)
    throw new Error('Recording changed since labeling.');
  return bytes.toString('base64');
}

function prepare() {
  mkdirSync(output, { recursive: true });
  const cases = buildPlan(JSON.parse(readFileSync(path.join(corpus, 'manifest.json'), 'utf8')));
  cases.forEach(audioFor);
  const plan = {
    sha: head(),
    model: 'gpt-realtime-2.1',
    max_calls: 14,
    max_output_tokens_per_call: 512,
    stop_upper_usd: 0.75,
    cases,
    note: 'Five blind transcripts, five target judgments, three near-word controls, one synthetic silence. No TTS or automatic retry.',
  };
  writeFileSync(path.join(output, 'plan.json'), JSON.stringify(plan, null, 2) + '\n');
  console.log(`Prepared ${cases.length} calls; private audio stays outside Git/Actions artifacts.`);
}

async function execute(deploymentFile) {
  const plan = JSON.parse(readFileSync(path.join(output, 'plan.json'), 'utf8'));
  const deployment = JSON.parse(readFileSync(deploymentFile, 'utf8'));
  if (
    plan.sha !== head() ||
    deployment.sha !== plan.sha ||
    deployment.engine !== 'openai-speak' ||
    deployment.target === 'production' ||
    plan.cases.length !== 14 ||
    plan.max_calls !== 14
  )
    throw new Error('Use the exact reviewed audio-only nonproduction deployment.');
  const expected = buildPlan(JSON.parse(readFileSync(path.join(corpus, 'manifest.json'), 'utf8')));
  assert.deepEqual(plan.cases, expected);
  plan.cases.forEach(audioFor);
  const ledger = path.join(output, 'attempts.jsonl');
  if (existsSync(ledger))
    throw new Error('A paid attempt already exists. Inspect it; do not automatically rerun.');
  let spent = 0;
  const results = [];
  for (const item of plan.cases) {
    if (spent >= 0.75) throw new Error('Conservative spending stop reached.');
    appendFileSync(
      ledger,
      JSON.stringify({ id: item.id, state: 'pending', at: new Date().toISOString() }) + '\n',
    );
    const record = await invoke(
      deployment.url,
      payloadFor(item, audioFor(item)),
      `openai-screen-${item.id}`,
    );
    if (record.http_status !== 200)
      throw new Error('Technical failure; stop without retry. Inspect private metadata.');
    spent += upperCost(record.result.usage);
    results.push({
      id: item.id,
      expected: item.expected,
      target: item.target ?? item.sample.target,
      decision: record.result.decision,
      usage: record.result.usage,
      wall_ms: record.client_wall_ms,
    });
    writeFileSync(
      path.join(output, 'results.json'),
      JSON.stringify(
        {
          sha: plan.sha,
          model: plan.model,
          conservative_upper_usd: spent,
          complete: results.length === plan.max_calls,
          results,
          note: 'Screening observations and model opinions, not validated pronunciation scores or adoption approval.',
        },
        null,
        2,
      ) + '\n',
    );
    appendFileSync(
      ledger,
      JSON.stringify({ id: item.id, state: 'returned', upper_usd: spent }) + '\n',
    );
    console.log(`Completed ${results.length}/14; conservative cumulative USD ${spent.toFixed(4)}.`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'plan') prepare();
  else if (process.argv[2] === 'execute' && process.argv[3]) await execute(process.argv[3]);
  else throw new Error('Commands: plan | execute <downloaded-deployment.json>');
}
