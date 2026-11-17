const element = (id) => document.getElementById(id);
let stream, context, source, capture, mute, timer;
let chunks = [];
let currentAudio;
let playbackUrl;
let recording = false;

for (const player of document.querySelectorAll('audio')) {
  player.addEventListener('play', () => {
    for (const other of document.querySelectorAll('audio')) {
      if (other !== player) other.pause();
    }
  });
}

async function post(route, data) {
  const response = await fetch(route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message ?? '操作未成功，请重试。');
  return result;
}

for (const button of document.querySelectorAll('[data-voice]')) {
  button.addEventListener('click', async () => {
    try {
      await post('/voice-choice', { voice: button.dataset.voice });
      element('choice-status').textContent = `音色选择已记录：${button.textContent}。`;
    } catch (error) {
      element('choice-status').textContent = '选择未保存：' + error.message;
    }
  });
}

for (const button of document.querySelectorAll('[data-compression]')) {
  button.addEventListener('click', async () => {
    try {
      await post('/compression-choice', { variant: button.dataset.compression });
      element('compression-status').textContent = `已记录：${button.textContent}。`;
    } catch (error) {
      element('compression-status').textContent = '选择未保存：' + error.message;
    }
  });
}

function encodeWav(samples, inputRate) {
  const rate = 16000;
  const frames = Math.floor((samples.length * rate) / inputRate);
  const buffer = new ArrayBuffer(44 + frames * 2);
  const view = new DataView(buffer);
  const text = (offset, value) =>
    [...value].forEach((character, index) =>
      view.setUint8(offset + index, character.charCodeAt(0)),
    );
  text(0, 'RIFF');
  view.setUint32(4, buffer.byteLength - 8, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, frames * 2, true);
  for (let index = 0; index < frames; index++) {
    const position = (index * inputRate) / rate;
    const left = Math.floor(position),
      weight = position - left;
    const sample = (samples[left] ?? 0) * (1 - weight) + (samples[left + 1] ?? 0) * weight;
    view.setInt16(44 + index * 2, Math.max(-1, Math.min(1, sample)) * 32767, true);
  }
  return new Uint8Array(buffer);
}

async function recognize() {
  element('result').textContent = '本机正在识别……首次需要加载免费模型。';
  const data = await post('/recognize', {
    target: element('target').value.trim(),
    audio: currentAudio,
  });
  const candidates = data.result.segments
    .flatMap((segment) => segment.alternatives ?? [])
    .map((item) => item.text);
  const lines = candidates.length
    ? candidates.map((text, index) => `${index + 1}. ${text}`)
    : ['没有识别到完整语音，请重录。'];
  lines.push(
    '',
    ...[1, 3, 5].map((k) => `前 ${k} 个候选：${data.matches[k] ? '包含目标词' : '未匹配目标词'}`),
  );
  if (data.result.invalid === 'multiple_segments')
    lines.push('这次识别到多个片段，请用单个词或短语重录。');
  element('result').textContent = lines.join('\n');
}

async function stop() {
  if (!recording) return;
  recording = false;
  clearTimeout(timer);
  element('stop').disabled = true;
  const rate = context.sampleRate;
  source.disconnect();
  capture.disconnect();
  mute.disconnect();
  stream.getTracks().forEach((track) => track.stop());
  await context.close();
  const samples = new Float32Array(chunks.reduce((length, chunk) => length + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    samples.set(chunk, offset);
    offset += chunk.length;
  }
  const wav = encodeWav(samples, rate);
  let binary = '';
  for (const byte of wav) binary += String.fromCharCode(byte);
  currentAudio = btoa(binary);
  if (playbackUrl) URL.revokeObjectURL(playbackUrl);
  playbackUrl = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
  element('recording').src = playbackUrl;
  element('recording').hidden = false;
  element('truth').value = '';
  element('record-status').textContent = '麦克风已关闭，识别中……';
  try {
    await recognize();
  } catch (error) {
    element('result').textContent = error.message;
  } finally {
    element('record').disabled = false;
    element('save').disabled = false;
    element('again').disabled = false;
    element('record-status').textContent = '录音已停止';
  }
}

element('record').addEventListener('click', async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1 },
      video: false,
    });
    context = new AudioContext();
    await context.audioWorklet.addModule('/capture.js');
    chunks = [];
    source = context.createMediaStreamSource(stream);
    capture = new AudioWorkletNode(context, 'microphone-capture');
    capture.port.onmessage = (event) => chunks.push(event.data);
    mute = context.createGain();
    mute.gain.value = 0;
    source.connect(capture);
    capture.connect(mute);
    mute.connect(context.destination);
    recording = true;
    element('save').disabled = true;
    element('again').disabled = true;
    element('record').disabled = true;
    element('stop').disabled = false;
    element('record-status').textContent = '录音中，最多 8 秒……';
    timer = setTimeout(stop, 8000);
  } catch (error) {
    stream?.getTracks().forEach((track) => track.stop());
    element('record-status').textContent = '没有开始录音：' + error.message;
  }
});
element('stop').addEventListener('click', stop);
element('again').addEventListener('click', async () => {
  try {
    await recognize();
  } catch (error) {
    element('result').textContent = error.message;
  }
});
element('save').addEventListener('click', async () => {
  if (!element('truth').value) {
    element('save-status').textContent = '请先选择人工判断。';
    return;
  }
  try {
    const data = await post('/save-sample', {
      audio: currentAudio,
      target: element('target').value.trim(),
      label: element('truth').value,
      human_confirmed: true,
      spoken_text: element('spoken').value,
      control: element('control').checked,
    });
    element('save-status').textContent =
      `本机已保存：读对 ${data.counts.correct} / 读错 ${data.counts.wrong} / 无效 ${data.counts.invalid}`;
  } catch (error) {
    element('save-status').textContent = error.message;
  }
});
