import type { Metadata } from 'next';
import { ReactNode } from 'react';

import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'The Grow Room',
  description: 'Friends-only guest room booking.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
