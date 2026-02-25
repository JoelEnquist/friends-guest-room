'use client';

import { useState } from 'react';

export function PhotoGallery({ photoUrls }: { photoUrls: string[] }) {
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  if (!photoUrls.length) {
    return <p className="text-sm text-[var(--muted)]">No photos added yet.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photoUrls.map((url) => (
          <button
            key={url}
            type="button"
            onClick={() => setActivePhoto(url)}
            className="overflow-hidden rounded-lg border border-[var(--border)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="The Grow Room" className="h-32 w-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>

      {activePhoto ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setActivePhoto(null)}
        >
          <div className="max-h-full max-w-3xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={activePhoto} alt="The Grow Room preview" className="max-h-[90vh] w-full rounded-xl object-contain" />
          </div>
        </div>
      ) : null}
    </>
  );
}
