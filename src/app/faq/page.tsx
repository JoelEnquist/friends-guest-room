import type { Metadata } from 'next';

import { PublicFrame } from '@/components/public-frame';

export const metadata: Metadata = {
  title: 'FAQ | The Grow Room',
  description: 'FAQ for The Grow Room invite-only guest room.',
};

export default function FaqPage() {
  const faqs = [
    {
      q: 'Who can stay?',
      a: 'The Grow Room is invite-only for friends and friends-of-friends in our network.',
    },
    {
      q: 'Can anyone book directly?',
      a: 'No. There are no public bookings. You must be invited first.',
    },
    {
      q: 'How long can I stay?',
      a: 'Up to 5 nights per booking request.',
    },
    {
      q: 'When do I get the address and door codes?',
      a: 'After approval, with door codes unlocking 24 hours before check-in.',
    },
    {
      q: 'Is there a fee?',
      a: 'The room is free. Guests either reset it for the next person or can optionally contribute to turnover cleaning.',
    },
  ];

  return (
    <PublicFrame>
      <section className="mx-auto max-w-3xl py-10 sm:py-16">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">FAQ</h1>
        <p className="mt-4 text-sm leading-7 text-black/70">
          The Grow Room is an invite-only guest room in San Francisco.
        </p>

        <div className="mt-8 divide-y divide-black/10 border-y border-black/10">
          {faqs.map((item) => (
            <div key={item.q} className="py-5">
              <h2 className="text-base font-medium">{item.q}</h2>
              <p className="mt-2 text-sm leading-7 text-black/70">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicFrame>
  );
}
