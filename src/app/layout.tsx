import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppProviders } from '@/client/AppProviders';
import './globals.css';

export const metadata: Metadata = {
  title: 'LingoCurrent',
  description: 'Learn English through reading, vocabulary, and practice.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
