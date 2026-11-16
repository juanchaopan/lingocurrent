import { it, expect } from 'vitest';
import { channelManifest } from './channels';

const source = {
  name: 'Fixture',
  allowedOrigin: 'https://example.org',
  termsReviewedAt: null,
  enabled: false,
  channels: [
    {
      name: 'Test',
      feedUrl: 'https://example.org/feed',
      category: 'Test',
      timezone: 'America/Toronto',
      enabled: false,
      schedules: [{ localTime: '09:00', targetCount: 1 }],
    },
  ],
};
it('validates channel manifests before writes', () => {
  expect(channelManifest.safeParse({ sources: [source] }).success).toBe(true);
  for (const replacement of [
    { timezone: 'Wrong/Zone' },
    { feedUrl: 'http://example.org/feed' },
    { feedUrl: 'not a URL' },
    { schedules: [{ localTime: '25:00', targetCount: 0 }] },
  ]) {
    expect(
      channelManifest.safeParse({
        sources: [{ ...source, channels: [{ ...source.channels[0], ...replacement }] }],
      }).success,
    ).toBe(false);
  }
  expect(channelManifest.safeParse({ sources: [source, source] }).success).toBe(false);
  expect(channelManifest.safeParse({ sources: [{ ...source, enabled: true }] }).success).toBe(
    false,
  );
});

it('reports malformed source URLs and icon data without throwing', () => {
  expect(
    channelManifest.safeParse({ sources: [{ ...source, allowedOrigin: 'not a URL' }] }).success,
  ).toBe(false);
  expect(
    channelManifest.safeParse({
      sources: [{ ...source, icon: { mimeType: 'image/png', base64: 'not!base64' } }],
    }).success,
  ).toBe(false);
  expect(
    channelManifest.safeParse({
      sources: [{ ...source, icon: { mimeType: 'image/png', base64: btoa('not a PNG') } }],
    }).success,
  ).toBe(false);
});
