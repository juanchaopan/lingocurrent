import 'server-only';
import { ZodError } from 'zod';
import { ApplicationError } from '../../shared/contracts/errors.ts';

export async function apiResponse(action: () => Promise<unknown>) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  try {
    return Response.json({ data: await action() }, { headers });
  } catch (error) {
    const problem = publicError(error);
    return Response.json(
      {
        error: {
          code: problem.code,
          message: problem.message,
          retryable: problem.status === 503,
          requestId: crypto.randomUUID(),
        },
      },
      { status: problem.status, headers },
    );
  }
}

function publicError(error: unknown) {
  if (error instanceof ApplicationError) return error;
  if (error instanceof ZodError || error instanceof SyntaxError)
    return new ApplicationError('INVALID_INPUT', 'Invalid request.', 422);
  return new ApplicationError('UNAVAILABLE', 'Workspace is unavailable. Please try again.', 503);
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const site = request.headers.get('sec-fetch-site');
  if ((origin && origin !== new URL(request.url).origin) || site === 'cross-site') {
    throw new ApplicationError('FORBIDDEN', 'Cross-site requests are not allowed.', 403);
  }
}
