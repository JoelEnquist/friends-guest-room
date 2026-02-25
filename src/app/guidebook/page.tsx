import { AppShell } from '@/components/app-shell';
import { PhotoGallery } from '@/components/photo-gallery';
import { requirePageUser } from '@/lib/access';
import { CLEANING_CONTRIBUTION_COPY } from '@/lib/email';
import { getSettings, resolvePhotoUrls } from '@/lib/settings';

export default async function GuidebookPage() {
  const user = await requirePageUser();
  const settings = await getSettings();
  const photoUrls = resolvePhotoUrls(settings);

  return (
    <AppShell
      title="The Grow Room guidebook"
      subtitle="Friends-only guest room"
      userName={user.name ?? user.email}
      role={user.role}
    >
      <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <div>
          <h2 className="text-base font-semibold">Arrival</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--muted)]">
            {settings.arrivalInstructions ??
              'You will receive arrival details from The Grow Room before check-in.'}
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold">Wi-Fi</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Network: {settings.wifiName ?? 'Provided after approval'}
          </p>
          <p className="text-sm text-[var(--muted)]">
            Password: {settings.wifiPassword ?? 'Provided after approval'}
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold">House guide</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--muted)]">
            {settings.guidebookText ?? 'Welcome to The Grow Room. Keep things cozy and simple.'}
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold">Nearby recommendations</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--muted)]">
            {settings.nearbyRecommendations ?? 'Ask us for current neighborhood favorites.'}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-slate-50 p-3">
          <h2 className="text-base font-semibold">Cleaning contribution</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{CLEANING_CONTRIBUTION_COPY}</p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-slate-50 p-3">
          <h2 className="text-base font-semibold">Pay it forward</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Pay it forward: If you finish something like shampoo or coffee and it is easy,
            replacing it helps the next guest and keeps this setup sustainable. If you are busy,
            no worries - just leave a note.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold">Photo gallery</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Tap any photo to view larger.</p>
          <div className="mt-2">
            <PhotoGallery photoUrls={photoUrls} />
          </div>
        </div>
      </section>
    </AppShell>
  );
}
