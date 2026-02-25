import Link from 'next/link';
import { SuggestionCategory, SuggestionStatus } from '@prisma/client';

import { AppShell } from '@/components/app-shell';
import { requirePageAdmin } from '@/lib/access';
import {
  categoryLabel,
  ownerEffortLabel,
  SUGGESTION_CATEGORY_OPTIONS,
  SUGGESTION_STATUS_OPTIONS,
  suggestionStatusLabel,
} from '@/lib/suggestion-options';
import {
  deriveActionableBy,
  listAdminSuggestions,
  parseSustainabilityPlan,
} from '@/lib/suggestions';

function formatDate(dateLike: Date): string {
  return dateLike.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function parseStatusFilter(value: string | string[] | undefined): SuggestionStatus | null {
  if (!value || Array.isArray(value) || value === 'ALL') return null;
  return Object.values(SuggestionStatus).includes(value as SuggestionStatus)
    ? (value as SuggestionStatus)
    : null;
}

function parseCategoryFilter(value: string | string[] | undefined): SuggestionCategory | null {
  if (!value || Array.isArray(value) || value === 'ALL') return null;
  return Object.values(SuggestionCategory).includes(value as SuggestionCategory)
    ? (value as SuggestionCategory)
    : null;
}

export default async function AdminSuggestionsPage({
  searchParams,
}: {
  searchParams?: { status?: string | string[]; category?: string | string[] };
}) {
  const user = await requirePageAdmin();
  const statusFilter = parseStatusFilter(searchParams?.status);
  const categoryFilter = parseCategoryFilter(searchParams?.category);
  const suggestions = await listAdminSuggestions({
    status: statusFilter,
    category: categoryFilter,
  });

  return (
    <AppShell
      title="The Grow Room admin suggestions"
      subtitle="Review sustainable improvement ideas from past guests"
      userName={user.name ?? user.email}
      role={user.role}
    >
      <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Suggestions triage</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Filter by status/category, then open a suggestion to review and update triage notes.
            </p>
          </div>
          <Link href="/admin" className="text-sm text-[var(--accent)] hover:underline">
            Back to admin →
          </Link>
        </div>

        <form className="grid gap-3 rounded-xl border border-[var(--border)] bg-white p-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm">
            <span>Status</span>
            <select
              name="status"
              defaultValue={statusFilter ?? 'ALL'}
              className="rounded-lg border border-[var(--border)] bg-white px-3 py-2"
            >
              <option value="ALL">All statuses</option>
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
              name="category"
              defaultValue={categoryFilter ?? 'ALL'}
              className="rounded-lg border border-[var(--border)] bg-white px-3 py-2"
            >
              <option value="ALL">All categories</option>
              {SUGGESTION_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex items-center rounded-lg border border-black px-3 py-2 text-sm hover:bg-black hover:text-white"
            >
              Apply filters
            </button>
            <Link href="/admin/suggestions" className="text-sm text-[var(--muted)] hover:underline">
              Clear
            </Link>
          </div>
        </form>

        {suggestions.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No suggestions match the current filters.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-slate-50 text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Suggestion</th>
                  <th className="px-3 py-2">Guest</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Effort</th>
                  <th className="px-3 py-2">Actionable</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {suggestions.map((suggestion) => {
                  const plan = parseSustainabilityPlan(suggestion.sustainabilityPlan);
                  return (
                    <tr key={suggestion.id} className="align-top">
                      <td className="px-3 py-3 whitespace-nowrap text-[var(--muted)]">
                        {formatDate(suggestion.createdAt)}
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/admin/suggestions/${suggestion.id}`}
                          className="font-medium text-black hover:underline"
                        >
                          {suggestion.title}
                        </Link>
                        <p className="mt-1 max-w-md text-xs text-[var(--muted)]">
                          {suggestion.idea}
                        </p>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-[var(--muted)]">
                        {suggestion.user.name ?? suggestion.user.email}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-[var(--muted)]">
                        {categoryLabel(suggestion.category)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-[var(--muted)]">
                        {ownerEffortLabel(suggestion.ownerEffort)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                          {deriveActionableBy(plan) === 'GUEST' ? 'Actionable by guest' : 'Owner task'}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="rounded-full bg-[var(--accent-soft)] px-2 py-1 text-xs text-[var(--accent)]">
                          {suggestionStatusLabel(suggestion.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
