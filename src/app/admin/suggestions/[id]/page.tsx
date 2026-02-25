import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell';
import { AdminSuggestionDetailClient } from '@/components/admin-suggestion-detail-client';
import { requirePageAdmin } from '@/lib/access';
import {
  categoryLabel,
  ownerEffortLabel,
  suggestionStatusLabel,
} from '@/lib/suggestion-options';
import {
  deriveActionableBy,
  getAdminSuggestionById,
  parseSustainabilityPlan,
} from '@/lib/suggestions';

function formatDate(dateLike: Date): string {
  return dateLike.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatStay(startDate: Date, endDate: Date): string {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

export default async function AdminSuggestionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requirePageAdmin();
  const suggestion = await getAdminSuggestionById(params.id);

  if (!suggestion) {
    notFound();
  }

  const plan = parseSustainabilityPlan(suggestion.sustainabilityPlan);
  const actionableBy = deriveActionableBy(plan);

  return (
    <AppShell
      title="Suggestion review"
      subtitle="Admin triage for sustainable improvement ideas"
      userName={user.name ?? user.email}
      role={user.role}
    >
      <div className="space-y-4">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Suggestion</p>
              <h2 className="text-lg font-semibold">{suggestion.title}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {suggestion.user.name ?? suggestion.user.email} • Submitted {formatDate(suggestion.createdAt)}
              </p>
            </div>
            <Link href="/admin/suggestions" className="text-sm text-[var(--accent)] hover:underline">
              Back to suggestions →
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--border)] bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Category</p>
              <p className="mt-1 text-sm">{categoryLabel(suggestion.category)}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Status</p>
              <p className="mt-1 text-sm">{suggestionStatusLabel(suggestion.status)}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Owner effort</p>
              <p className="mt-1 text-sm">{ownerEffortLabel(suggestion.ownerEffort)}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Actionability</p>
              <p className="mt-1 text-sm">
                {actionableBy === 'GUEST' ? 'Actionable by guest' : 'Owner task'}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--border)] bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                Sustainability plan
              </p>
              <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                {plan.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Context</p>
              {suggestion.relatedBooking ? (
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Related stay: {formatStay(suggestion.relatedBooking.startDate, suggestion.relatedBooking.endDate)}
                </p>
              ) : (
                <p className="mt-2 text-sm text-[var(--muted)]">No specific stay selected.</p>
              )}
              {suggestion.estimatedCost ? (
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Estimated cost: {suggestion.estimatedCost}
                </p>
              ) : null}
              {suggestion.productUrl ? (
                <p className="mt-1 text-sm">
                  <a
                    href={suggestion.productUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-[var(--accent)] hover:underline"
                  >
                    Product link →
                  </a>
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-[var(--border)] bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Idea</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
              {suggestion.idea}
            </p>
          </div>
        </section>

        <AdminSuggestionDetailClient
          suggestionId={suggestion.id}
          initialStatus={suggestion.status}
          initialCategory={suggestion.category}
          initialOwnerEffort={suggestion.ownerEffort}
          initialAdminNotes={suggestion.adminNotes}
        />
      </div>
    </AppShell>
  );
}
