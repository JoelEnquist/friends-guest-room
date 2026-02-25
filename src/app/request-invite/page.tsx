import type { Metadata } from 'next';

import { PublicFrame } from '@/components/public-frame';
import { RequestInviteForm } from '@/components/request-invite-form';

export const metadata: Metadata = {
  title: 'Request an invite | The Grow Room',
  description: 'Request invite-only access to The Grow Room guest room in San Francisco.',
};

export default function RequestInvitePage() {
  return (
    <PublicFrame>
      <section className="mx-auto max-w-3xl py-10 sm:py-16">
        <div className="mb-8 border-b border-black/10 pb-6">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Request an invite to The Grow Room
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-black/70">
            The Grow Room is free for our network. Share a bit about who you are and your trip - we use this to decide whether to approve access.
          </p>
        </div>
        <RequestInviteForm />
      </section>
    </PublicFrame>
  );
}
