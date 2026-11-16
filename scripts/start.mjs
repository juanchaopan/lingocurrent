import { cpSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const server = '.next/standalone/server.js';
if (!existsSync(server)) throw new Error('Run pnpm build before pnpm start.');
cpSync('.next/static', '.next/standalone/.next/static', { recursive: true });
cpSync('public', '.next/standalone/public', { recursive: true });
const child = spawn(process.execPath, [server], {
  stdio: 'inherit',
  env: { ...process.env, HOSTNAME: process.env.APP_HOST ?? '127.0.0.1' },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', (code) => process.exit(code ?? 1));
child.on('error', () => process.exit(1));
