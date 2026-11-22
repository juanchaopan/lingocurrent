import assert from 'node:assert/strict';
import { test } from 'node:test';
import { accepted, summarize } from './runner.mjs';

test('K changes near-word acceptance without treating path scores as probabilities', () => {
  const record = {
    http_status: 200,
    result: {
      invalid: null,
      segments: [
        {
          alternatives: [
            { text: 'sheep', confidence: 80 },
            { text: 'ship', confidence: 79 },
          ],
        },
      ],
    },
  };
  assert.equal(accepted(record, 'ship', 1), false);
  assert.equal(accepted(record, 'SHIP', 3), true);
  assert.equal(accepted({ http_status: 422 }, 'ship', 3), null);
  assert.equal(accepted({ http_status: 200, result: { invalid: 'no_speech' } }, 'ship', 3), false);
  assert.equal(
    accepted({ http_status: 200, result: { decision: { verdict: 'uncertain' } } }, 'ship', 1),
    null,
  );
});

function fixture() {
  return [
    ...Array.from({ length: 10 }, () => ({
      label: 'correct',
      accepts: { 1: true, 3: true, 5: true },
    })),
    ...Array.from({ length: 10 }, () => ({
      label: 'wrong',
      accepts: { 1: false, 3: false, 5: false },
    })),
    ...Array.from({ length: 3 }, () => ({
      label: 'invalid',
      accepts: { 1: false, 3: false, 5: false },
    })),
    ...Array.from({ length: 3 }, () => ({
      label: 'wrong',
      control: true,
      accepts: { 1: false, 3: false, 5: false },
    })),
  ];
}

test('incomplete samples, technical failure, and a wrong-target acceptance cannot pass quality gates', () => {
  assert.equal(summarize(fixture(), 'vosk').k[1].initial_gate, true);
  assert.equal(summarize(fixture().slice(1), 'vosk').k[1].initial_gate, false);
  const technical = fixture();
  technical[0].accepts[1] = null;
  assert.equal(summarize(technical, 'vosk').k[1].initial_gate, false);
  const controlFailure = fixture();
  controlFailure.at(-1).accepts[3] = true;
  assert.equal(summarize(controlFailure, 'vosk').k[3].initial_gate, false);
  const invalidFailure = fixture();
  invalidFailure[20].accepts[5] = true;
  assert.equal(summarize(invalidFailure, 'vosk').k[5].initial_gate, false);
});
