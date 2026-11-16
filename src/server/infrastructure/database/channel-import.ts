import 'server-only';
import { createHash } from 'node:crypto';
import { and, eq, notInArray } from 'drizzle-orm';
import { channelManifest, type ChannelManifest } from '../../../shared/contracts/channels.ts';
import { sourceIcons, sources, channels, channelSchedules } from './content-schema.ts';
import type { Database, Transaction } from './connection.ts';

type SourceInput = ChannelManifest['sources'][number];
type ChannelInput = SourceInput['channels'][number];

async function saveIcon(tx: Transaction, icon: SourceInput['icon']) {
  if (!icon) return undefined;
  const bytes = Buffer.from(icon.base64, 'base64');
  const checksum = createHash('sha256').update(bytes).digest('hex');
  const [row] = await tx
    .insert(sourceIcons)
    .values({ bytes, mimeType: icon.mimeType, byteSize: bytes.length, checksum })
    .onConflictDoUpdate({ target: sourceIcons.checksum, set: { checksum } })
    .returning();
  return row.id;
}

async function saveChannel(tx: Transaction, sourceId: string, channel: ChannelInput) {
  const [existing] = await tx.select().from(channels).where(eq(channels.feedUrl, channel.feedUrl));
  if (existing && existing.sourceId !== sourceId)
    throw new Error('A feed cannot be reassigned to a different source.');
  const values = {
    sourceId,
    name: channel.name,
    feedUrl: channel.feedUrl,
    category: channel.category,
    timezone: channel.timezone,
    enabled: channel.enabled,
  };
  const [row] = await tx
    .insert(channels)
    .values(values)
    .onConflictDoUpdate({ target: channels.feedUrl, set: values })
    .returning();
  const times = channel.schedules.map((schedule) => schedule.localTime);
  await tx
    .delete(channelSchedules)
    .where(
      times.length
        ? and(eq(channelSchedules.channelId, row.id), notInArray(channelSchedules.localTime, times))
        : eq(channelSchedules.channelId, row.id),
    );
  for (const schedule of channel.schedules) {
    const values = { channelId: row.id, ...schedule, enabled: false, nextRunAt: null };
    await tx
      .insert(channelSchedules)
      .values(values)
      .onConflictDoUpdate({
        target: [channelSchedules.channelId, channelSchedules.localTime],
        set: values,
      });
  }
}

export async function importChannels(db: Database, input: unknown, apply: boolean) {
  const manifest = channelManifest.parse(input);
  return db.transaction(async (tx) => {
    const current = {
      sources: await tx.select().from(sources),
      channels: await tx.select().from(channels),
      schedules: await tx.select().from(channelSchedules),
    };
    if (apply)
      for (const source of manifest.sources) {
        const existing = current.sources.find((item) => item.name === source.name);
        if (
          existing &&
          current.channels.some(
            (item) =>
              item.sourceId === existing.id &&
              new URL(item.feedUrl).origin !== source.allowedOrigin,
          )
        ) {
          throw new Error('The source origin must also match its retained channels.');
        }
        const values = {
          name: source.name,
          allowedOrigin: source.allowedOrigin,
          enabled: source.enabled,
          termsReviewedAt: source.termsReviewedAt ? new Date(source.termsReviewedAt) : null,
          ...(source.icon && { iconId: await saveIcon(tx, source.icon) }),
        };
        const [row] = await tx
          .insert(sources)
          .values(values)
          .onConflictDoUpdate({ target: sources.name, set: values })
          .returning();
        for (const channel of source.channels) await saveChannel(tx, row.id, channel);
      }
    return { applied: apply, current, requested: manifest, scheduleEnabled: false };
  });
}
