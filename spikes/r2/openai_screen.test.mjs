import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPlan, payloadFor, upperCost } from './openai_screen.mjs';

test('paid screen is bounded, blind inputs have no target, controls are not homophones', () => {
  const manifest = {
    samples: ['ship', 'avocado', 'see', 'seed', 'currant'].map((target, index) => ({
      id: `sample-${index}`,
      target,
      human_confirmed: true,
      label: 'correct',
      control: false,
    })),
  };
  const cases = buildPlan(manifest);
  assert.equal(cases.length, 14);
  assert.equal(cases.filter((item) => item.mode === 'speak_transcribe').length, 5);
  assert.equal(cases.filter((item) => item.expected === 'different').length, 3);
  for (const item of cases.filter((item) => item.mode === 'speak_transcribe')) {
    assert.equal('target' in payloadFor(item, 'audio'), false);
  }
  assert.equal(
    cases.some((item) => item.sample?.target === 'currant' && item.target === 'current'),
    false,
  );
  manifest.samples[0].human_confirmed = false;
  assert.throws(() => buildPlan(manifest), /explicitly labeled/);
});

test('missing usage stops subsequent charges and all input tokens are priced conservatively', () => {
  assert.throws(() => upperCost(null), /Usage unavailable/);
  assert.throws(() => upperCost({ input_tokens: -1, output_tokens: 2 }), /Usage unavailable/);
  assert.equal(upperCost({ input_tokens: 1000, output_tokens: 100 }), 0.0344);
});
