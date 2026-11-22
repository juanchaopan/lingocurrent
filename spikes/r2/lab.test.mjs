import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { chromium } from '@playwright/test';

test('recorder retries safely and keeps human labels separate from model matches', async () => {
  const html = await readFile(new URL('./lab.html', import.meta.url));
  const javascript = await readFile(new URL('./lab.js', import.meta.url));
  const recordings = [];
  const savedLabels = [];
  const server = createServer(async (request, response) => {
    if (request.url === '/' || request.url === '/lab.js') {
      response.setHeader('Content-Type', request.url === '/' ? 'text/html' : 'text/javascript');
      response.end(request.url === '/' ? html : javascript);
    } else if (['/recognize', '/save-sample'].includes(request.url)) {
      const parts = [];
      for await (const part of request) parts.push(part);
      const payload = JSON.parse(Buffer.concat(parts).toString());
      response.setHeader('Content-Type', 'application/json');
      // Fixed responses test UI semantics, not ASR quality or the owner's corpus.
      if (request.url === '/recognize') {
        recordings.push(payload);
        response.end(
          JSON.stringify({
            result: {
              segments: [
                {
                  alternatives: ['the cd', 'the seed', 'the scene', 'the seedy', 'the seat'].map(
                    (text) => ({ text }),
                  ),
                },
              ],
            },
            matches: { 1: false, 3: false, 5: false },
          }),
        );
      } else {
        savedLabels.push(payload.label);
        response.end(JSON.stringify({ counts: { correct: 4, wrong: 0, invalid: 0 } }));
      }
    } else {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({
      args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
    });
    const page = await browser.newPage();
    let externalModuleRequests = 0;
    await page.route('**/capture.js', (route) => {
      externalModuleRequests++;
      return route.abort();
    });
    await page.addInitScript(() => {
      const NativeContext = window.AudioContext;
      const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      window.testStreams = [];
      window.testContexts = [];
      navigator.mediaDevices.getUserMedia = async (options) => {
        const stream = await getUserMedia(options);
        window.testStreams.push(stream);
        return stream;
      };
      window.AudioContext = class extends NativeContext {
        constructor(...args) {
          super(...args);
          window.testContexts.push(this);
          if (window.testContexts.length === 1) {
            this.audioWorklet.addModule = async () => {
              throw new Error('simulated initialization failure');
            };
          }
        }
      };
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator('#target').fill('seed');
    const record = page.getByRole('button', { name: '开始录音', exact: true });
    await record.click();
    await page
      .getByText('没有开始录音：simulated initialization failure', { exact: true })
      .waitFor();
    assert.equal(await record.isEnabled(), true);
    assert.equal(
      await page.evaluate(() =>
        window.testStreams[0].getTracks().every((t) => t.readyState === 'ended'),
      ),
      true,
    );
    assert.equal(await page.evaluate(() => window.testContexts[0].state), 'closed');

    await record.click();
    await page.getByText('录音中，最多 8 秒……', { exact: true }).waitFor();
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: '停止并识别', exact: true }).click();
    await page.getByText('录音已停止', { exact: true }).waitFor();
    assert.equal(externalModuleRequests, 0);
    assert.equal(recordings.length, 1);
    const wav = Buffer.from(recordings[0].audio, 'base64');
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
    assert.equal(wav.readUInt16LE(22), 1);
    assert.equal(wav.readUInt32LE(24), 16000);
    assert.equal(wav.readUInt16LE(34), 16);
    assert.ok(wav.length > 44 + 0.3 * 16000 * 2, 'captured PCM frames');
    assert.ok(
      wav.subarray(44).some((byte) => byte !== 0),
      'captured synthetic microphone signal',
    );
    assert.equal(await page.locator('#recording').isVisible(), true);
    assert.equal(await record.isEnabled(), true);
    assert.equal(
      await page.evaluate(() =>
        window.testStreams.every((s) => s.getTracks().every((t) => t.readyState === 'ended')),
      ),
      true,
    );
    assert.equal(
      await page.evaluate(() => window.testContexts.every((c) => c.state === 'closed')),
      true,
    );

    const modelResult = await page.locator('#result').innerText();
    assert.ok(modelResult.includes('2. the seed'));
    for (const k of [1, 3, 5]) assert.ok(modelResult.includes(`前 ${k} 个候选：未匹配目标词`));
    await page.locator('#truth').selectOption('correct');
    await page.locator('#save').click();
    await page.getByText('已保存人工标注，未判定模型通过。', { exact: false }).waitFor();
    assert.deepEqual(savedLabels, ['correct']);
    assert.match(await page.locator('#save-status').innerText(), /累计人工样本：读目标词 4/);
    assert.equal(await page.locator('#result').innerText(), modelResult);
    await page.locator('#again').click();
    assert.equal(await page.locator('#save-status').innerText(), '');
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
