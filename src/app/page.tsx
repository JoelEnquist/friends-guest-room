import type { Metadata } from 'next';
import Link from 'next/link';

import { LandingAvailabilitySignal } from '@/components/landing-availability-signal';
import { PublicFrame } from '@/components/public-frame';

export const metadata: Metadata = {
  title: 'The Grow Room',
  description: 'Invite-only guest room in San Francisco for friends and friends-of-friends.',
  openGraph: {
    title: 'The Grow Room',
    description: 'Invite-only guest room in San Francisco for friends and friends-of-friends.',
    type: 'website',
  },
};

export default function HomePage() {
  return (
    <PublicFrame>
      <div className="mx-auto max-w-6xl">
        <section className="border-b border-black/10 py-14 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start">
            <div className="max-w-4xl">
              <p className="mb-5 text-xs uppercase tracking-[0.16em] text-black/50 sm:text-sm sm:tracking-[0.14em]">
                Invite-only guest room in San Francisco
              </p>
              <h1 className="text-6xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-8xl lg:text-[6.1rem]">
                The Grow Room
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-black/70 sm:text-lg">
                Invite-only guest room in San Francisco for friends and friends-of-friends.
              </p>
              <p className="mt-7 max-w-3xl whitespace-pre-line text-[15px] leading-7 text-black/80 sm:text-base">
                {`A small, private guest room behind our garage - with its own entrance - offered for free within our network.
If you're visiting for meetings, conferences, or time in the city, you can request an invite.`}
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  href="/request-invite"
                  className="inline-flex items-center rounded-full border border-black px-4 py-2 text-sm transition hover:-translate-y-px hover:bg-black hover:text-white"
                >
                  Request an invite →
                </Link>
                <Link href="/login" className="text-sm text-black/70 underline-offset-4 hover:text-black hover:underline">
                  Sign in →
                </Link>
              </div>
              <p className="mt-5 text-[11px] uppercase tracking-[0.14em] text-black/45">
                Invite-only. No public bookings.
              </p>
            </div>

            <div className="lg:pt-3">
              <LandingAvailabilitySignal />
            </div>
          </div>
        </section>

        <section className="grid gap-8 border-b border-black/10 py-10 sm:grid-cols-[1fr_2fr] sm:py-14">
          <h2 className="text-xl font-medium tracking-[-0.02em] sm:text-2xl">What it is</h2>
          <div className="space-y-4">
            <p className="text-sm leading-7 text-black/75">
              A compact guest room with its own entrance, private shower/toilet, a bed, small desk,
              couch, and a microwave/oven/air fryer setup. Simple, quiet, and designed for short stays.
            </p>
            <ul className="space-y-2 text-sm text-black/80">
              <li>Own entrance + private bathroom (shower + toilet + sink)</li>
              <li>Bed + small desk + couch</li>
              <li>Microwave / oven / air fryer combo</li>
              <li>Wi-Fi</li>
              <li>Self check-in (details shared after approval)</li>
            </ul>
          </div>
        </section>

        <section className="grid gap-8 border-b border-black/10 py-10 sm:grid-cols-[1fr_2fr] sm:py-14">
          <h2 className="text-xl font-medium tracking-[-0.02em] sm:text-2xl">How it works</h2>
          <ol className="space-y-3 text-sm text-black/80">
            <li>1) Request an invite</li>
            <li>2) If approved, view availability and request dates (max 5 nights)</li>
            <li>3) Arrival details (including door codes) are shared 24 hours before check-in</li>
          </ol>
        </section>

        <section className="grid gap-8 border-b border-black/10 py-10 sm:grid-cols-[1fr_2fr] sm:py-14">
          <h2 className="text-xl font-medium tracking-[-0.02em] sm:text-2xl">Keeping it sustainable</h2>
          <div className="space-y-4 text-sm leading-7 text-black/80">
            <p>
              The Grow Room is free for people in our network. To keep it sustainable, we ask guests to either reset it for the next person or optionally contribute to turnover cleaning.
            </p>
            <ul className="space-y-2">
              <li>Reset it yourself (quick tidy + trash + used linens in the laundry bag), or</li>
              <li>Optional cleaning contribution - $20 per stay + optional $10 tip (Venmo or cash)</li>
            </ul>
            <p>
              We pass 100% of this directly to a professional cleaner for turnover cleaning - we don&apos;t keep any of it.
            </p>
            <p>
              If you finish something like shampoo or coffee and it&apos;s easy, replacing it helps keep this sustainable.
            </p>
          </div>
        </section>

        <section className="grid gap-8 border-b border-black/10 py-10 sm:grid-cols-[1fr_2fr] sm:py-14">
          <h2 className="text-xl font-medium tracking-[-0.02em] sm:text-2xl">Privacy & safety</h2>
          <ul className="space-y-2 text-sm text-black/80">
            <li>Invite-only - no public bookings</li>
            <li>Guest names aren&apos;t shown to other guests</li>
            <li>Address and door codes are shared only after approval</li>
            <li>Door codes unlock 24 hours before check-in</li>
          </ul>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-4 py-8 text-xs text-black/55">
          <p>
            Built by Joel Enquist as a lightweight, invite-only booking system for a real guest room.
          </p>
          <div className="flex gap-4">
            <Link href="/request-invite" className="hover:text-black">Request invite →</Link>
            <Link href="/login" className="hover:text-black">Sign in →</Link>
          </div>
        </footer>
      </div>
    </PublicFrame>
  );
}
