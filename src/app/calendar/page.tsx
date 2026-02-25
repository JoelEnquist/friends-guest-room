import { AppShell } from '@/components/app-shell';
import { BookingClient } from '@/components/booking-client';
import { requirePageUser } from '@/lib/access';

export default async function CalendarPage() {
  const user = await requirePageUser();

  return (
    <AppShell
      title="The Grow Room calendar"
      subtitle="Friends-only guest room"
      userName={user.name ?? user.email}
      role={user.role}
    >
      <BookingClient
        initialName={user.name ?? ''}
        initialEmail={user.email}
        showCalendar
      />
    </AppShell>
  );
}
