'use client';

import { FormEvent, useState } from 'react';

export function RequestInviteForm() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    socialProfileUrl: '',
    mutualContact: '',
    tripPurpose: '',
    startDate: '',
    endDate: '',
    company: '',
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const response = await fetch('/api/invite-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await response.json();
    setSubmitting(false);

    if (!response.ok) {
      setError(data.error?.formErrors?.[0] ?? data.error ?? 'Unable to submit request.');
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-black/10 p-5 text-sm">
        Thanks - if it&apos;s a fit, we&apos;ll email you an invite link to book.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <label className="grid gap-1 text-sm">
        <span>Full name</span>
        <input
          required
          value={form.fullName}
          onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
          className="rounded-xl border border-black/15 px-3 py-2"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>Email</span>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          className="rounded-xl border border-black/15 px-3 py-2"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>Social profile link (LinkedIn / website / X / Facebook)</span>
        <input
          type="url"
          required
          value={form.socialProfileUrl}
          onChange={(e) => setForm((p) => ({ ...p, socialProfileUrl: e.target.value }))}
          className="rounded-xl border border-black/15 px-3 py-2"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>Who do you know? (someone you and we both know)</span>
        <input
          required
          value={form.mutualContact}
          onChange={(e) => setForm((p) => ({ ...p, mutualContact: e.target.value }))}
          className="rounded-xl border border-black/15 px-3 py-2"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>Purpose of trip (meetings / conference / visiting friends / etc.)</span>
        <textarea
          required
          value={form.tripPurpose}
          onChange={(e) => setForm((p) => ({ ...p, tripPurpose: e.target.value }))}
          className="min-h-24 rounded-xl border border-black/15 px-3 py-2"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span>Check-in</span>
          <input
            type="date"
            required
            value={form.startDate}
            onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
            className="rounded-xl border border-black/15 px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Check-out</span>
          <input
            type="date"
            required
            value={form.endDate}
            onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
            className="rounded-xl border border-black/15 px-3 py-2"
          />
        </label>
      </div>

      <div className="hidden" aria-hidden="true">
        <label className="grid gap-1 text-sm">
          <span>Company</span>
          <input
            tabIndex={-1}
            autoComplete="off"
            value={form.company}
            onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
            className="rounded-xl border border-black/15 px-3 py-2"
          />
        </label>
      </div>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-fit items-center rounded-xl border border-black px-4 py-2 text-sm hover:bg-black hover:text-white disabled:opacity-60"
      >
        {submitting ? 'Sending...' : 'Request invite →'}
      </button>
    </form>
  );
}
