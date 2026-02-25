import { AppShell } from '@/components/app-shell';
import { AdminDashboardClient } from '@/components/admin-dashboard-client';
import { requirePageAdmin } from '@/lib/access';

export default async function AdminPage() {
  const user = await requirePageAdmin();

  return (
    <AppShell
      title="The Grow Room admin"
      subtitle="Approve requests, manage blocks, and maintain settings"
      userName={user.name ?? user.email}
      role={user.role}
    >
      <AdminDashboardClient />
    </AppShell>
  );
}
