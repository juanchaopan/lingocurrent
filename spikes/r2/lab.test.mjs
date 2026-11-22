import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { chromium } from '@playwright/test';

test('recorder survives blocked external worklet loading and cleans up failed starts', async () => {
  const html = await readFile(new URL('./lab.html', import.meta.url));
  const javascript = await readFile(new URL('./lab.js', import.meta.url));
  const recordings = [];
  const server = createServer(async (request, response) => {
    if (request.url === '/' || request.url === '/lab.js') {
      response.setHeader('Content-Type', request.url === '/' ? 'text/html' : 'text/javascript');
      response.end(request.url === '/' ? html : javascript);
    } else if (request.url === '/recognize') {
      const parts = [];
      for await (const part of request) parts.push(part);
      recordings.push(JSON.parse(Buffer.concat(parts).toString()));
      response.setHeader('Content-Type', 'application/json');
      // Only the browser recording boundary is under test here, not ASR quality.
      response.end(JSON.stringify({ result: { segments: [] }, matches: {} }));
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
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
