import 'server-only';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { PlaybackAsset } from '../modules/media/services/playback.ts';

export function storageClient() {
  for (const key of [
    'S3_ENDPOINT',
    'S3_REGION',
    'S3_BUCKET',
    'S3_ACCESS_KEY_ID',
    'S3_SECRET_ACCESS_KEY',
  ]) {
    if (!process.env[key]) throw new Error('Private storage is not configured.');
  }
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });
}
export async function signArticleAudio(asset: PlaybackAsset) {
  const client = storageClient();
  try {
    const url = await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: asset.objectKey,
        ...(asset.objectVersion !== 'null' && { VersionId: asset.objectVersion }),
      }),
      { expiresIn: 600 },
    );
    return { url, expiresAt: new Date(Date.now() + 600_000).toISOString() };
  } finally {
    client.destroy();
  }
}
