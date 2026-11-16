'use client';

import { useAuth } from '@clerk/nextjs';
import type { ReactNode } from 'react';
import { AppProviders } from './AppProviders';

export function AuthenticatedProviders({ children }: { children: ReactNode }) {
  const { userId, sessionId } = useAuth();
  return (
    <AppProviders key={`${userId ?? 'signed-out'}:${sessionId ?? ''}`}>{children}</AppProviders>
  );
}
