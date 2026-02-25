import { AppShell } from '@/components/app-shell';
import { SuggestionsClient } from '@/components/suggestions-client';
import { requirePageUser } from '@/lib/access';
import {
  listCompletedStaysForUser,
  listSuggestionsForUser,
  parseSustainabilityPlan,
  userHasCompletedStay,
} from '@/lib/suggestions';

export default async function SuggestionsPage() {
  const user = await requirePageUser();

  const [eligible, completedStays, suggestions] = await Promise.all([
    userHasCompletedStay(user.id),
    listCompletedStaysForUser(user.id),
    listSuggestionsForUser(user.id),
  ]);

  return (
    <AppShell
      title="The Grow Room suggestions"
      subtitle="Suggest sustainable improvements after your first stay"
      userName={user.name ?? user.email}
      role={user.role}
    >
      <SuggestionsClient
        eligible={eligible}
        completedStays={completedStays.map((stay) => ({
          id: stay.id,
          startDate: stay.startDate.toISOString(),
          endDate: stay.endDate.toISOString(),
        }))}
        suggestions={suggestions.map((suggestion) => ({
          id: suggestion.id,
          title: suggestion.title,
          idea: suggestion.idea,
          category: suggestion.category,
          ownerEffort: suggestion.ownerEffort,
          estimatedCost: suggestion.estimatedCost,
          productUrl: suggestion.productUrl,
          status: suggestion.status,
          sustainabilityPlan: parseSustainabilityPlan(suggestion.sustainabilityPlan),
          createdAt: suggestion.createdAt.toISOString(),
          relatedBooking: suggestion.relatedBooking
            ? {
                id: suggestion.relatedBooking.id,
                startDate: suggestion.relatedBooking.startDate.toISOString(),
                endDate: suggestion.relatedBooking.endDate.toISOString(),
              }
            : null,
        }))}
      />
    </AppShell>
  );
}
