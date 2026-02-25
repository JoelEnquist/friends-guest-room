import { Role } from '@prisma/client';
import { ReactNode } from 'react';

import { NavLinks } from '@/components/nav-links';
import { SignOutButton } from '@/components/sign-out-button';

export function AppShell({
  children,
  userName,
  role,
  title,
  subtitle,
}: {
  children: ReactNode;
  userName?: string | null;
  role: Role;
  title: string;
  subtitle?: string;
}) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
      <header className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">The Grow Room</p>
            <h1 className="text-xl font-semibold sm:text-2xl">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p> : null}
            {userName ? (
              <p className="mt-1 text-xs text-[var(--muted)]">Signed in as {userName}</p>
            ) : null}
          </div>
          <SignOutButton />
        </div>

        <div className="mt-4">
          <NavLinks isAdmin={role === 'ADMIN'} />
        </div>
      </header>

      {children}
    </main>
  );
}
