import { AppShell } from '@/components/app-shell';
import { BookingClient } from '@/components/booking-client';
import { requirePageUser } from '@/lib/access';

export default async function BookingsPage() {
  const user = await requirePageUser();

  return (
    <AppShell
      title="The Grow Room bookings"
      subtitle="View, cancel, or reschedule your requests"
      userName={user.name ?? user.email}
      role={user.role}
    >
      <BookingClient
        initialName={user.name ?? ''}
        initialEmail={user.email}
        showCalendar={false}
        showHeading={false}
      />
    </AppShell>
  );
}
