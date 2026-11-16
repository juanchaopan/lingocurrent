import 'server-only';
import { auth } from '@clerk/nextjs/server';
import { ApplicationError } from '../../shared/contracts/errors.ts';
import type { MemberServices } from '../application/workspace-core.ts';
import { connectDatabase } from './database/connection.ts';
import { memberScope } from './database/member-scope.ts';
import { signArticleAudio } from './storage.ts';

let database: ReturnType<typeof connectDatabase> | undefined;
export const workspaceDependencies = {
  async session() {
    if (!process.env.CLERK_SECRET_KEY || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
      throw new ApplicationError('UNAVAILABLE', 'Sign-in is not configured yet.', 503);
    }
    return (await auth({ acceptsToken: 'session_token' })).userId;
  },
  async run<T>(clerkId: string, action: (services: MemberServices) => Promise<T>): Promise<T> {
    if (!process.env.DATABASE_URL)
      throw new ApplicationError('UNAVAILABLE', 'Workspace is unavailable.', 503);
    database ??= connectDatabase(process.env.DATABASE_URL);
    return memberScope(database.db)(clerkId, action);
  },
  sign: signArticleAudio,
};
