'use client';

import { SuggestionCategory, SuggestionOwnerEffort, SuggestionStatus } from '@prisma/client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  OWNER_EFFORT_OPTIONS,
  SUGGESTION_CATEGORY_OPTIONS,
  SUGGESTION_STATUS_OPTIONS,
} from '@/lib/suggestion-options';

export function AdminSuggestionDetailClient({
  suggestionId,
  initialStatus,
  initialCategory,
  initialOwnerEffort,
  initialAdminNotes,
}: {
  suggestionId: string;
  initialStatus: SuggestionStatus;
  initialCategory: SuggestionCategory;
  initialOwnerEffort: SuggestionOwnerEffort;
  initialAdminNotes?: string | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    status: initialStatus,
    category: initialCategory,
    ownerEffort: initialOwnerEffort,
    adminNotes: initialAdminNotes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/admin/suggestions/${suggestionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(data.error?.formErrors?.[0] ?? data.error ?? 'Unable to update suggestion.');
      return;
    }

    setMessage('Suggestion updated.');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl border border-[var(--border)] bg-white p-4 sm:p-6">
      <h2 className="text-base font-semibold">Admin triage</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-1 text-sm">
          <span>Status</span>
          <select
            value={form.status}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, status: event.target.value as SuggestionStatus }))
            }
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2"
          >
            {SUGGESTION_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span>Category</span>
          <select
            value={form.category}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, category: event.target.value as SuggestionCategory }))
            }
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2"
          >
            {SUGGESTION_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span>Owner effort</span>
          <select
            value={form.ownerEffort}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                ownerEffort: event.target.value as SuggestionOwnerEffort,
              }))
            }
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2"
          >
            {OWNER_EFFORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-1 text-sm">
        <span>Internal admin notes</span>
        <textarea
          value={form.adminNotes}
          onChange={(event) => setForm((prev) => ({ ...prev, adminNotes: event.target.value }))}
          className="min-h-28 rounded-xl border border-[var(--border)] bg-white px-3 py-2"
          placeholder="Triage notes, follow-up, or why this was accepted/declined."
        />
      </label>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="text-sm text-[var(--accent)]">{message}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex w-fit items-center rounded-xl border border-black px-4 py-2 text-sm hover:bg-black hover:text-white disabled:opacity-60"
      >
        {saving ? 'Saving...' : 'Save triage'}
      </button>
    </form>
  );
}
