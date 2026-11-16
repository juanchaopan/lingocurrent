import { getHealth } from '@/server/application/health';

export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(getHealth(), { headers: { 'Cache-Control': 'no-store' } });
}
