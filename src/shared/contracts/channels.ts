import { z } from 'zod';

const httpsUrl = z.url().refine((value) => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password && !url.hash;
}, 'Use an HTTPS URL without credentials or a fragment.');
const timezone = z.string().refine((value) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}, 'Use a valid IANA timezone.');
const icon = z
  .strictObject({
    mimeType: z.enum(['image/png', 'image/webp']),
    base64: z.string().min(4).max(87384),
  })
  .refine(
    (image) => validIcon(image.mimeType, image.base64),
    'Supply a PNG or WebP icon no larger than 64 KiB.',
  );

function validIcon(mime: string, encoded: string) {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))
    return false;
  const decoded = atob(encoded);
  if (decoded.length > 65536) return false;
  return mime === 'image/png'
    ? decoded.startsWith('\x89PNG\r\n\x1a\n')
    : decoded.startsWith('RIFF') && decoded.slice(8, 12) === 'WEBP';
}
export const channelManifest = z
  .strictObject({
    sources: z
      .array(
        z.strictObject({
          name: z.string().trim().min(1).max(100),
          allowedOrigin: httpsUrl.refine(
            (value) => URL.canParse(value) && new URL(value).origin === value,
            'Supply only the origin.',
          ),
          termsReviewedAt: z.iso.datetime().nullable(),
          enabled: z.boolean(),
          icon: icon.optional(),
          channels: z
            .array(
              z.strictObject({
                name: z.string().trim().min(1).max(100),
                feedUrl: httpsUrl,
                category: z.string().trim().min(1).max(100),
                timezone,
                enabled: z.boolean(),
                schedules: z
                  .array(
                    z.strictObject({
                      localTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
                      targetCount: z.number().int().min(1).max(100),
                    }),
                  )
                  .max(24),
              }),
            )
            .min(1)
            .max(100),
        }),
      )
      .min(1)
      .max(100),
  })
  .superRefine((manifest, ctx) => {
    const names = new Set<string>();
    const feeds = new Set<string>();
    for (const source of manifest.sources) {
      if (names.has(source.name) || (source.enabled && !source.termsReviewedAt)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Source names must be unique and enabled sources need reviewed terms.',
        });
      }
      names.add(source.name);
      for (const channel of source.channels) {
        if (feeds.has(channel.feedUrl) || !matchesOrigin(channel.feedUrl, source.allowedOrigin)) {
          ctx.addIssue({
            code: 'custom',
            message: 'Feed URLs must be unique and match the source origin.',
          });
        }
        feeds.add(channel.feedUrl);
        const times = channel.schedules.map((schedule) => schedule.localTime);
        if (new Set(times).size !== times.length)
          ctx.addIssue({ code: 'custom', message: 'Duplicate schedule time.' });
      }
    }
  });
export type ChannelManifest = z.infer<typeof channelManifest>;

function matchesOrigin(value: string, origin: string) {
  return URL.canParse(value) && new URL(value).origin === origin;
}
