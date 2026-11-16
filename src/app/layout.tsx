import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppProviders } from '@/client/AppProviders';
import { AuthenticatedProviders } from '@/client/AuthenticatedProviders';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'LingoCurrent',
  description: 'Learn English through reading, vocabulary, and practice.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
          <ClerkProvider
            signInUrl="/sign-in"
            signInFallbackRedirectUrl="/"
            signUpFallbackRedirectUrl="/"
            afterSignOutUrl="/sign-in"
          >
            <AuthenticatedProviders>{children}</AuthenticatedProviders>
          </ClerkProvider>
        ) : (
          <AppProviders>{children}</AppProviders>
        )}
      </body>
    </html>
  );
}
