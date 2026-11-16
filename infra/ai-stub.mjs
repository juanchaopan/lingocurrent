import { createServer } from 'node:http';

createServer((request, response) => {
  const healthy = request.method === 'GET' && request.url === '/health';
  response.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json' });
  response.end(
    JSON.stringify(
      healthy
        ? { status: 'ok' }
        : {
            error:
              'AI fixtures are not configured. Implement deterministic fixtures with the relevant roadmap issue.',
          },
    ),
  );
}).listen(8080, '0.0.0.0');
