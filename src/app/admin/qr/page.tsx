import QRCode from 'qrcode';

import { AppShell } from '@/components/app-shell';
import { requirePageAdmin } from '@/lib/access';

export default async function AdminQrPage() {
  const user = await requirePageAdmin();
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const guidebookUrl = `${baseUrl}/guidebook`;
  const qrCodeDataUrl = await QRCode.toDataURL(guidebookUrl, {
    width: 320,
    margin: 1,
  });

  return (
    <AppShell
      title="The Grow Room QR"
      subtitle="Print-friendly guidebook QR"
      userName={user.name ?? user.email}
      role={user.role}
    >
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 print:border-0 print:shadow-none">
        <h2 className="text-xl font-semibold">The Grow Room Guide</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Scan for guidebook + checklist</p>

        <div className="mt-4 w-fit rounded-xl border border-[var(--border)] p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCodeDataUrl} alt="The Grow Room guidebook QR code" className="h-56 w-56" />
        </div>

        <p className="mt-4 break-all text-sm text-[var(--muted)]">{guidebookUrl}</p>
      </section>
    </AppShell>
  );
}
