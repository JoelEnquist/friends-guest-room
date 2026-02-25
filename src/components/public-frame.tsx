import Link from 'next/link';
import { ReactNode } from 'react';

export function PublicFrame({ children }: { children: ReactNode }) {
  return (
    <main className="public-shell min-h-screen">
      <div className="relative z-10 mx-auto w-full max-w-[78rem] px-4 py-5 sm:px-8 sm:py-8">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-4 sm:pb-5">
          <div className="min-w-0">
            <Link href="/" className="block text-[15px] font-semibold tracking-[-0.02em] sm:text-base">
              The Grow Room
            </Link>
            <p className="mt-0.5 hidden text-[11px] tracking-[0.04em] text-black/45 sm:block">
              Friends-only guest room
            </p>
          </div>
          <nav className="flex items-center gap-4 text-[12px] tracking-[0.02em] text-black/70 sm:gap-5 sm:text-sm">
            <Link href="/faq" className="hover:text-black">
              FAQ
            </Link>
            <Link href="/request-invite" className="hover:text-black">
              Request invite →
            </Link>
            <Link href="/login" className="hover:text-black">
              Sign in →
            </Link>
          </nav>
        </header>
        {children}
      </div>
    </main>
  );
}
