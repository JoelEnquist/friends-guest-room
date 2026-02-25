'use client';

import { SuggestionCategory, SuggestionOwnerEffort, SuggestionStatus } from '@prisma/client';
import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  categoryLabel,
  OWNER_EFFORT_OPTIONS,
  ownerEffortLabel,
  SUGGESTION_CATEGORY_OPTIONS,
  suggestionStatusLabel,
  SUSTAINABILITY_PLAN_OPTIONS,
  type SustainabilityPlanValue,
} from '@/lib/suggestion-options';

type CompletedStayOption = {
  id: string;
  startDate: string;
  endDate: string;
};

type UserSuggestion = {
  id: string;
  title: string;
  idea: string;
  category: SuggestionCategory;
  ownerEffort: SuggestionOwnerEffort;
  estimatedCost?: string | null;
  productUrl?: string | null;
  status: SuggestionStatus;
  sustainabilityPlan: SustainabilityPlanValue[];
  relatedBooking?: { id: string; startDate: string; endDate: string } | null;
  createdAt: string;
};

function formatDate(dateLike: string): string {
  return new Date(dateLike).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatStay(startDate: string, endDate: string): string {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function statusClasses(status: SuggestionStatus): string {
  switch (status) {
    case 'DONE':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'ACCEPTED':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'REVIEWING':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'DECLINED':
      return 'bg-zinc-100 text-zinc-600 border-zinc-200';
    default:
      return 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--border)]';
  }
}

export function SuggestionsClient({
  eligible,
  completedStays,
  suggestions,
}: {
  eligible: boolean;
  completedStays: CompletedStayOption[];
  suggestions: UserSuggestion[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    category: 'OTHER' as SuggestionCategory,
    idea: '',
    ownerEffort: 'LT_5_MIN' as SuggestionOwnerEffort,
    estimatedCost: '',
    productUrl: '',
    relatedBookingId: '',
    takeOwnershipNextTime: false,
    sustainabilityPlan: [] as SustainabilityPlanValue[],
  });

  const completedStayOptions = useMemo(
    () =>
      completedStays.map((stay) => ({
        ...stay,
        label: formatStay(stay.startDate, stay.endDate),
      })),
    [completedStays],
  );

  function togglePlan(option: SustainabilityPlanValue) {
    setForm((prev) => {
      const has = prev.sustainabilityPlan.includes(option);
      return {
        ...prev,
        sustainabilityPlan: has
          ? prev.sustainabilityPlan.filter((value) => value !== option)
          : [...prev.sustainabilityPlan, option],
      };
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const mergedPlan = Array.from(
      new Set([
        ...form.sustainabilityPlan,
        ...(form.takeOwnershipNextTime ? (['I can do this next time'] as SustainabilityPlanValue[]) : []),
      ]),
    );

    const response = await fetch('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        category: form.category,
        idea: form.idea,
        sustainabilityPlan: mergedPlan,
        ownerEffort: form.ownerEffort,
        estimatedCost: form.estimatedCost,
        productUrl: form.productUrl,
        relatedBookingId: form.relatedBookingId,
      }),
    });

    const data = await response.json();
    setSubmitting(false);

    if (!response.ok) {
      setError(data.error?.formErrors?.[0] ?? data.error ?? 'Unable to submit suggestion.');
      return;
    }

    setMessage('Suggestion submitted. Thank you for helping keep The Grow Room sustainable.');
    setForm({
      title: '',
      category: 'OTHER',
      idea: '',
      ownerEffort: 'LT_5_MIN',
      estimatedCost: '',
      productUrl: '',
      relatedBookingId: '',
      takeOwnershipNextTime: false,
      sustainabilityPlan: [],
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <h2 className="text-base font-semibold">Suggestions</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          The Grow Room is meant to be self-sustaining. If you have an idea, please suggest
          improvements that are easy for us to implement (&lt;15 minutes), something another guest can
          do, or something you can do yourself this time or next time.
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Treat it like it&apos;s your own space - small tweaks that make it better for the next
          person are the best kind.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <h3 className="text-base font-semibold">Submit an idea</h3>
        {!eligible ? (
          <p className="mt-2 text-sm text-[var(--muted)]">
            Suggestions are available after your first stay.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 grid gap-4">
            <label className="grid gap-1 text-sm">
              <span>Title</span>
              <input
                required
                maxLength={80}
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                className="rounded-xl border border-[var(--border)] bg-white px-3 py-2"
                placeholder="Small fix that helps the next guest"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span>Category</span>
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      category: event.target.value as SuggestionCategory,
                    }))
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
                <span>Owner effort estimate</span>
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

            {completedStayOptions.length > 0 ? (
              <label className="grid gap-1 text-sm">
                <span>Related stay (optional)</span>
                <select
                  value={form.relatedBookingId}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, relatedBookingId: event.target.value }))
                  }
                  className="rounded-xl border border-[var(--border)] bg-white px-3 py-2"
                >
                  <option value="">Not tied to a specific stay</option>
                  {completedStayOptions.map((stay) => (
                    <option key={stay.id} value={stay.id}>
                      {stay.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="grid gap-1 text-sm">
              <span>Suggestion / idea</span>
              <textarea
                required
                minLength={12}
                value={form.idea}
                onChange={(event) => setForm((prev) => ({ ...prev, idea: event.target.value }))}
                className="min-h-28 rounded-xl border border-[var(--border)] bg-white px-3 py-2"
                placeholder="Describe the improvement and why it helps future guests."
              />
            </label>

            <fieldset className="grid gap-2 rounded-xl border border-[var(--border)] p-3">
              <legend className="px-1 text-sm font-medium">Sustainability plan</legend>
              {SUSTAINABILITY_PLAN_OPTIONS.map((option) => (
                <label key={option} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.sustainabilityPlan.includes(option)}
                    onChange={() => togglePlan(option)}
                    className="mt-0.5"
                  />
                  <span>{option}</span>
                </label>
              ))}
              <label className="mt-1 flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.takeOwnershipNextTime}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, takeOwnershipNextTime: event.target.checked }))
                  }
                  className="mt-0.5"
                />
                <span>I can take ownership next time</span>
              </label>
              <p className="text-xs text-[var(--muted)]">
                For higher-effort ideas, include a guest-doable plan (especially if owner effort is
                &gt; 60 minutes).
              </p>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span>Cost estimate (optional)</span>
                <input
                  value={form.estimatedCost}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, estimatedCost: event.target.value }))
                  }
                  className="rounded-xl border border-[var(--border)] bg-white px-3 py-2"
                  placeholder="$0, <$20, $20–$50"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span>Product link (optional)</span>
                <input
                  type="url"
                  value={form.productUrl}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, productUrl: event.target.value }))
                  }
                  className="rounded-xl border border-[var(--border)] bg-white px-3 py-2"
                  placeholder="https://..."
                />
              </label>
            </div>

            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
            {message ? <p className="text-sm text-[var(--accent)]">{message}</p> : null}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-fit items-center rounded-xl border border-black px-4 py-2 text-sm hover:bg-black hover:text-white disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit suggestion'}
            </button>
          </form>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold">Your suggestions</h3>
          <span className="text-xs text-[var(--muted)]">{suggestions.length} total</span>
        </div>

        {suggestions.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">No suggestions submitted yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {suggestions.map((suggestion) => (
              <article
                key={suggestion.id}
                className="rounded-xl border border-[var(--border)] bg-white p-3 sm:p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-black">{suggestion.title}</h4>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {categoryLabel(suggestion.category)} • {ownerEffortLabel(suggestion.ownerEffort)} •{' '}
                      {formatDate(suggestion.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-1 text-xs ${statusClasses(
                      suggestion.status,
                    )}`}
                  >
                    {suggestionStatusLabel(suggestion.status)}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
                  {suggestion.idea}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {suggestion.sustainabilityPlan.map((planItem) => (
                    <span
                      key={`${suggestion.id}-${planItem}`}
                      className="rounded-full bg-[var(--accent-soft)] px-2 py-1 text-xs text-[var(--accent)]"
                    >
                      {planItem}
                    </span>
                  ))}
                </div>

                {suggestion.relatedBooking ? (
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    Related stay: {formatStay(suggestion.relatedBooking.startDate, suggestion.relatedBooking.endDate)}
                  </p>
                ) : null}

                {suggestion.estimatedCost ? (
                  <p className="mt-1 text-xs text-[var(--muted)]">Estimated cost: {suggestion.estimatedCost}</p>
                ) : null}

                {suggestion.productUrl ? (
                  <p className="mt-1 text-xs">
                    <a
                      href={suggestion.productUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-[var(--accent)] underline-offset-4 hover:underline"
                    >
                      Product link →
                    </a>
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
