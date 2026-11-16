export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.VERCEL === '1') {
    const { registerOTel } = await import('@vercel/otel');
    registerOTel({ serviceName: 'lingocurrent' });
  }
}
