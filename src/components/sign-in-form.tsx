'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';

export function SignInForm({ showGoogle = true }: { showGoogle?: boolean }) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const result = await signIn('email', {
      email,
      callbackUrl: '/calendar',
      redirect: false,
    });

    setSubmitting(false);

    if (result?.error) {
      setMessage('Sign-in failed. Confirm this email is invited and try again.');
      return;
    }

    setMessage('Check your inbox for a secure magic link.');
  }

  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border border-black/10 bg-white p-6 sm:p-8">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">The Grow Room</h1>
      <p className="mt-3 text-sm leading-7 text-black/65">
        Invite-only booking for friends and friends-of-friends.
      </p>

      <form className="mt-8 space-y-4" onSubmit={handleMagicLink}>
        <label className="block text-sm" htmlFor="email">
          <span className="mb-1.5 block font-medium">Email</span>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-black/15 bg-white px-3 py-2.5"
          placeholder="you@example.com"
        />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl border border-black bg-black px-4 py-2.5 text-white hover:bg-white hover:text-black disabled:opacity-60"
        >
          {submitting ? 'Sending...' : 'Send sign-in link →'}
        </button>
        <p className="text-xs text-black/55">We&apos;ll email a secure link. No password.</p>
      </form>

      {showGoogle ? (
        <>
          <div className="my-6 border-t border-black/10" />
          <button
            className="w-full rounded-xl border border-black/15 px-4 py-2.5 text-sm"
            onClick={() => signIn('google', { callbackUrl: '/calendar' })}
            type="button"
          >
            Continue with Google →
          </button>
        </>
      ) : null}

      <div className="mt-6 border-t border-black/10 pt-4">
        <Link href="/request-invite" className="text-sm text-black/70 hover:text-black">
          Request an invite →
        </Link>
      </div>

      {message ? <p className="mt-4 text-sm text-black/65">{message}</p> : null}
    </div>
  );
}
