'use client';

import { useAuth, useClerk, useUser } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { useReadingWorkspace } from '../data-access/useReadingWorkspace';
import { ReadingPanel } from '../components/ReadingPanel';

export function ReadingPage() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  if (!isLoaded)
    return (
      <main>
        <p role="status">Loading sign-in…</p>
      </main>
    );
  if (!isSignedIn)
    return (
      <main className="welcome">
        <h1>LingoCurrent</h1>
        <p>Read. Collect vocabulary. Practice.</p>
        <Link href="/sign-in">Sign in</Link>
        <p>Access is by invitation.</p>
      </main>
    );
  return <MemberReading key={userId} userId={userId} />;
}

function MemberReading({ userId }: { userId: string }) {
  const reading = useReadingWorkspace(userId);
  const [signOutError, setSignOutError] = useState<string>();
  const { signOut } = useClerk();
  const { user } = useUser();
  const queryClient = useQueryClient();
  async function logout() {
    await queryClient.cancelQueries();
    queryClient.clear();
    reading.onClose();
    try {
      await signOut({ redirectUrl: '/sign-in' });
    } catch {
      setSignOutError('Could not sign out. Please try again.');
    }
  }
  return (
    <main>
      <ReadingPanel
        {...reading}
        error={signOutError ?? reading.error}
        account={
          <details className="account-menu">
            <summary aria-label="Account menu">{user?.firstName?.slice(0, 1) ?? 'Account'}</summary>
            <button onClick={() => void logout()}>Log out</button>
          </details>
        }
      />
    </main>
  );
}
