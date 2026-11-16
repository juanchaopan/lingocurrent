import 'server-only';

export function getHealth() {
  return { status: 'ok', service: 'lingocurrent' } as const;
}
