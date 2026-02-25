'use client';

import { BookingStatus, CleaningPlan, Role } from '@prisma/client';
import { useEffect, useMemo, useState } from 'react';

import { CLEANING_CONTRIBUTION_COPY } from '@/lib/email';

type Booking = {
  id: string;
  guestName: string;
  guestEmail: string;
  startDate: string;
  endDate: string;
  status: BookingStatus;
  cleaningPlan: CleaningPlan;
  note?: string | null;
  phone?: string | null;
  arrivalEmailSentAt?: string | null;
};

type Invite = {
  email: string;
  name?: string | null;
  role: Role;
  allowed: boolean;
};

type Blackout = {
  id: string;
  title?: string | null;
  startDate: string;
  endDate: string;
  source: string;
};

type AuditLog = {
  id: string;
  actionType: string;
  actorEmail?: string | null;
  timestamp: string;
};

type InviteRequest = {
  id: string;
  fullName: string;
  email: string;
  socialProfileUrl: string;
  mutualContact: string;
  tripPurpose: string;
  requestedStartDate: string;
  requestedEndDate: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  reviewedAt?: string | null;
  createdAt: string;
};

type Settings = {
  wifiName?: string | null;
  wifiPassword?: string | null;
  arrivalInstructions?: string | null;
  guidebookText?: string | null;
  nearbyRecommendations?: string | null;
  venmoHandle?: string | null;
  paymentInstructions?: string | null;
  checkoutChecklist?: string | null;
  propertyDoorCode?: string | null;
  guestRoomDoorCode?: string | null;
  lastDoorCodeRotationAt?: string | null;
  photoUrls?: string[];
};

function formatDate(dateLike: string): string {
  return new Date(dateLike).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function AdminDashboardClient() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteRequests, setInviteRequests] = useState<InviteRequest[]>([]);
  const [blackouts, setBlackouts] = useState<Blackout[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [photoUrlInput, setPhotoUrlInput] = useState('');

  const [inviteInput, setInviteInput] = useState({ email: '', role: 'GUEST' as Role, name: '' });
  const [blackoutInput, setBlackoutInput] = useState({ title: '', startDate: '', endDate: '' });
  const [manualBooking, setManualBooking] = useState({
    guestName: '',
    guestEmail: '',
    startDate: '',
    endDate: '',
    phone: '',
    note: '',
    cleaningPlan: 'SELF_CLEAN' as CleaningPlan,
    status: 'APPROVED' as BookingStatus,
  });

  const [editDrafts, setEditDrafts] = useState<
    Record<string, { startDate: string; endDate: string; status: BookingStatus }>
  >({});

  const pendingCount = useMemo(
    () => bookings.filter((booking) => booking.status === 'NEEDS_APPROVAL').length,
    [bookings],
  );

  const refresh = async () => {
    setLoading(true);

    const [bookingsRes, invitesRes, inviteRequestsRes, blackoutsRes, settingsRes, auditRes] =
      await Promise.all([
      fetch('/api/admin/bookings', { cache: 'no-store' }),
      fetch('/api/admin/invites', { cache: 'no-store' }),
      fetch('/api/admin/invite-requests', { cache: 'no-store' }),
      fetch('/api/admin/blackouts', { cache: 'no-store' }),
      fetch('/api/admin/settings', { cache: 'no-store' }),
      fetch('/api/admin/audit', { cache: 'no-store' }),
    ]);

    if (bookingsRes.ok) {
      const data = await bookingsRes.json();
      setBookings(data.bookings ?? []);
      setEditDrafts(
        Object.fromEntries(
          (data.bookings ?? []).map((booking: Booking) => [
            booking.id,
            {
              startDate: booking.startDate.slice(0, 10),
              endDate: booking.endDate.slice(0, 10),
              status: booking.status,
            },
          ]),
        ),
      );
    }

    if (invitesRes.ok) {
      const data = await invitesRes.json();
      setInvites(data.invites ?? []);
    }

    if (inviteRequestsRes.ok) {
      const data = await inviteRequestsRes.json();
      setInviteRequests(data.inviteRequests ?? []);
    }

    if (blackoutsRes.ok) {
      const data = await blackoutsRes.json();
      setBlackouts(data.blackouts ?? []);
    }

    if (settingsRes.ok) {
      const data = await settingsRes.json();
      setSettings(data.settings ?? {});
    }

    if (auditRes.ok) {
      const data = await auditRes.json();
      setAuditLog(data.auditLog ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const setBookingStatus = async (bookingId: string, status: BookingStatus) => {
    const response = await fetch(`/api/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setStatus', status }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? 'Unable to update status.');
      return;
    }

    setMessage(`Booking ${status.toLowerCase()}.`);
    await refresh();
  };

  const sendArrivalEmailNow = async (bookingId: string) => {
    const response = await fetch(`/api/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sendArrivalEmailNow' }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? 'Unable to send arrival email.');
      return;
    }

    setMessage('Arrival email sent.');
    await refresh();
  };

  const saveBookingEdit = async (booking: Booking) => {
    const draft = editDrafts[booking.id];

    if (!draft) {
      return;
    }

    const datesChanged =
      draft.startDate !== booking.startDate.slice(0, 10) ||
      draft.endDate !== booking.endDate.slice(0, 10);

    if (datesChanged) {
      const rescheduleRes = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reschedule',
          startDate: draft.startDate,
          endDate: draft.endDate,
          note: booking.note,
          phone: booking.phone,
        }),
      });

      const rescheduleData = await rescheduleRes.json();

      if (!rescheduleRes.ok) {
        setMessage(rescheduleData.error ?? 'Unable to update booking dates.');
        return;
      }

      // Approved stays downgrade to NEEDS_APPROVAL on reschedule. Re-apply admin-selected status.
      if (draft.status !== 'NEEDS_APPROVAL') {
        await setBookingStatus(booking.id, draft.status);
        return;
      }
    }

    if (draft.status !== booking.status) {
      await setBookingStatus(booking.id, draft.status);
      return;
    }

    setMessage('Booking updated.');
    await refresh();
  };

  const createManualBooking = async () => {
    const response = await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manualBooking),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? 'Unable to create manual booking.');
      return;
    }

    setMessage('Manual booking created.');
    setManualBooking({
      guestName: '',
      guestEmail: '',
      startDate: '',
      endDate: '',
      phone: '',
      note: '',
      cleaningPlan: 'SELF_CLEAN',
      status: 'APPROVED',
    });
    await refresh();
  };

  const createBlackout = async () => {
    const response = await fetch('/api/admin/blackouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blackoutInput),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? 'Unable to create blackout.');
      return;
    }

    setMessage('Blackout saved.');
    setBlackoutInput({ title: '', startDate: '', endDate: '' });
    await refresh();
  };

  const deleteBlackout = async (blackoutId: string) => {
    const response = await fetch(`/api/admin/blackouts/${blackoutId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      setMessage('Unable to remove blackout.');
      return;
    }

    setMessage('Blackout removed.');
    await refresh();
  };

  const addInvite = async () => {
    const response = await fetch('/api/admin/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inviteInput),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? 'Unable to invite user.');
      return;
    }

    setMessage('Invite added.');
    setInviteInput({ email: '', role: 'GUEST', name: '' });
    await refresh();
  };

  const removeInvite = async (email: string) => {
    const response = await fetch(`/api/admin/invites/${encodeURIComponent(email)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      setMessage('Unable to remove invite.');
      return;
    }

    setMessage('Invite removed.');
    await refresh();
  };

  const reviewInviteRequest = async (inviteRequestId: string, action: 'approve' | 'deny') => {
    const response = await fetch(`/api/admin/invite-requests/${inviteRequestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? 'Unable to review invite request.');
      return;
    }

    setMessage(action === 'approve' ? 'Invite request approved.' : 'Invite request denied.');
    await refresh();
  };

  const saveSettings = async () => {
    const response = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? 'Unable to update settings.');
      return;
    }

    setMessage('Settings updated.');
    await refresh();
  };

  const addPhotoUrl = () => {
    const trimmed = photoUrlInput.trim();

    if (!trimmed) {
      return;
    }

    try {
      const parsed = new URL(trimmed);
      setSettings((prev) => ({
        ...prev,
        photoUrls: [...new Set([...(prev.photoUrls ?? []), parsed.toString()])],
      }));
      setPhotoUrlInput('');
    } catch {
      setMessage('Photo URL must be a valid URL.');
    }
  };

  const removePhotoUrl = (url: string) => {
    setSettings((prev) => ({
      ...prev,
      photoUrls: (prev.photoUrls ?? []).filter((item) => item !== url),
    }));
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <p className="text-sm text-[var(--muted)]">
          {pendingCount} request(s) need approval.
          {loading ? ' Refreshing...' : ''}
        </p>
        {message ? <p className="mt-2 text-sm text-[var(--accent)]">{message}</p> : null}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <h2 className="text-base font-semibold">Invite requests</h2>
        <div className="mt-3 space-y-3">
          {inviteRequests.map((request) => (
            <article key={request.id} className="rounded-xl border border-[var(--border)] p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{request.fullName}</p>
                  <p className="text-xs text-[var(--muted)]">{request.email}</p>
                  <p className="text-xs text-[var(--muted)]">
                    Requested: {formatDate(request.requestedStartDate)} - {formatDate(request.requestedEndDate)}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--accent-soft)] px-2 py-1 text-xs text-[var(--accent)]">
                  {request.status}
                </span>
              </div>
              <div className="mt-3 space-y-1 text-xs text-[var(--muted)]">
                <p>Profile: {request.socialProfileUrl}</p>
                <p>Mutual contact: {request.mutualContact}</p>
                <p>Purpose: {request.tripPurpose}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void reviewInviteRequest(request.id, 'approve')}
                  className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm text-white"
                  disabled={request.status === 'APPROVED'}
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => void reviewInviteRequest(request.id, 'deny')}
                  className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm text-rose-700"
                  disabled={request.status === 'DENIED'}
                >
                  Deny
                </button>
              </div>
            </article>
          ))}
          {inviteRequests.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No invite requests yet.</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <h2 className="text-base font-semibold">Booking requests</h2>
        <div className="mt-3 space-y-3">
          {bookings.map((booking) => (
            <article key={booking.id} className="rounded-xl border border-[var(--border)] p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{booking.guestName}</p>
                  <p className="text-xs text-[var(--muted)]">{booking.guestEmail}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--accent-soft)] px-2 py-1 text-xs text-[var(--accent)]">
                  {booking.status}
                </span>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <input
                  type="date"
                  value={editDrafts[booking.id]?.startDate ?? booking.startDate.slice(0, 10)}
                  onChange={(event) =>
                    setEditDrafts((prev) => ({
                      ...prev,
                      [booking.id]: {
                        ...prev[booking.id],
                        startDate: event.target.value,
                      },
                    }))
                  }
                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={editDrafts[booking.id]?.endDate ?? booking.endDate.slice(0, 10)}
                  onChange={(event) =>
                    setEditDrafts((prev) => ({
                      ...prev,
                      [booking.id]: {
                        ...prev[booking.id],
                        endDate: event.target.value,
                      },
                    }))
                  }
                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                />
                <select
                  value={editDrafts[booking.id]?.status ?? booking.status}
                  onChange={(event) =>
                    setEditDrafts((prev) => ({
                      ...prev,
                      [booking.id]: {
                        ...prev[booking.id],
                        status: event.target.value as BookingStatus,
                      },
                    }))
                  }
                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                >
                  <option value="NEEDS_APPROVAL">Needs approval</option>
                  <option value="APPROVED">Approved</option>
                  <option value="DENIED">Denied</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void saveBookingEdit(booking)}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm"
                >
                  Save edits
                </button>
                <button
                  type="button"
                  onClick={() => void setBookingStatus(booking.id, 'APPROVED')}
                  className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm text-white"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => void setBookingStatus(booking.id, 'DENIED')}
                  className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm text-rose-700"
                >
                  Deny
                </button>
                {booking.status === 'APPROVED' ? (
                  <button
                    type="button"
                    onClick={() => void sendArrivalEmailNow(booking.id)}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm"
                  >
                    Send arrival email now
                  </button>
                ) : null}
              </div>
              {booking.arrivalEmailSentAt ? (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Arrival email last sent: {new Date(booking.arrivalEmailSentAt).toLocaleString()}
                </p>
              ) : null}
            </article>
          ))}
          {bookings.length === 0 ? <p className="text-sm text-[var(--muted)]">No bookings yet.</p> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <h2 className="text-base font-semibold">Manual booking</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            placeholder="Guest name"
            value={manualBooking.guestName}
            onChange={(event) => setManualBooking((prev) => ({ ...prev, guestName: event.target.value }))}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <input
            placeholder="Guest email"
            value={manualBooking.guestEmail}
            onChange={(event) => setManualBooking((prev) => ({ ...prev, guestEmail: event.target.value }))}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={manualBooking.startDate}
            onChange={(event) => setManualBooking((prev) => ({ ...prev, startDate: event.target.value }))}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={manualBooking.endDate}
            onChange={(event) => setManualBooking((prev) => ({ ...prev, endDate: event.target.value }))}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <select
            value={manualBooking.cleaningPlan}
            onChange={(event) =>
              setManualBooking((prev) => ({ ...prev, cleaningPlan: event.target.value as CleaningPlan }))
            }
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          >
            <option value="SELF_CLEAN">Self clean</option>
            <option value="PAY_VENMO_OR_CASH">Cleaning contribution ($20 + suggested $10 tip)</option>
          </select>
          <select
            value={manualBooking.status}
            onChange={(event) =>
              setManualBooking((prev) => ({ ...prev, status: event.target.value as BookingStatus }))
            }
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          >
            <option value="APPROVED">Approved</option>
            <option value="NEEDS_APPROVAL">Needs approval</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => void createManualBooking()}
          className="mt-3 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white"
        >
          Create manual booking
        </button>
        <p className="mt-2 text-xs text-[var(--muted)]">{CLEANING_CONTRIBUTION_COPY}</p>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <h2 className="text-base font-semibold">Blackout dates</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input
            placeholder="Title (optional)"
            value={blackoutInput.title}
            onChange={(event) => setBlackoutInput((prev) => ({ ...prev, title: event.target.value }))}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={blackoutInput.startDate}
            onChange={(event) => setBlackoutInput((prev) => ({ ...prev, startDate: event.target.value }))}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={blackoutInput.endDate}
            onChange={(event) => setBlackoutInput((prev) => ({ ...prev, endDate: event.target.value }))}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => void createBlackout()}
          className="mt-3 rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
        >
          Add blackout
        </button>
        <div className="mt-3 space-y-2">
          {blackouts.map((blackout) => (
            <div key={blackout.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] p-2 text-sm">
              <span>
                {blackout.title ? `${blackout.title} - ` : ''}
                {formatDate(blackout.startDate)} to {formatDate(blackout.endDate)} ({blackout.source})
              </span>
              <button
                type="button"
                onClick={() => void deleteBlackout(blackout.id)}
                className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <h2 className="text-base font-semibold">Invite allowlist</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input
            placeholder="Email"
            value={inviteInput.email}
            onChange={(event) => setInviteInput((prev) => ({ ...prev, email: event.target.value }))}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <input
            placeholder="Name (optional)"
            value={inviteInput.name}
            onChange={(event) => setInviteInput((prev) => ({ ...prev, name: event.target.value }))}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <select
            value={inviteInput.role}
            onChange={(event) => setInviteInput((prev) => ({ ...prev, role: event.target.value as Role }))}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          >
            <option value="GUEST">Guest</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => void addInvite()}
          className="mt-3 rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
        >
          Add invite
        </button>

        <div className="mt-3 space-y-2">
          {invites.map((invite) => (
            <div key={invite.email} className="flex items-center justify-between rounded-lg border border-[var(--border)] p-2 text-sm">
              <span>
                {invite.email} ({invite.role})
              </span>
              <button
                type="button"
                onClick={() => void removeInvite(invite.email)}
                className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <h2 className="text-base font-semibold">Global settings</h2>
        {settings.lastDoorCodeRotationAt ? (
          <p className="mt-2 text-xs text-[var(--muted)]">
            Door codes last rotated: {new Date(settings.lastDoorCodeRotationAt).toLocaleDateString()}
          </p>
        ) : (
          <p className="mt-2 text-xs text-[var(--muted)]">Door codes have not been rotated yet.</p>
        )}
        <div className="mt-3 grid gap-2">
          <input
            placeholder="Property Door Code"
            value={settings.propertyDoorCode ?? ''}
            onChange={(event) =>
              setSettings((prev) => ({ ...prev, propertyDoorCode: event.target.value }))
            }
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <input
            placeholder="Grow Room Door Code"
            value={settings.guestRoomDoorCode ?? ''}
            onChange={(event) =>
              setSettings((prev) => ({ ...prev, guestRoomDoorCode: event.target.value }))
            }
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <input
            placeholder="Wi-Fi network"
            value={settings.wifiName ?? ''}
            onChange={(event) => setSettings((prev) => ({ ...prev, wifiName: event.target.value }))}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <input
            placeholder="Wi-Fi password"
            value={settings.wifiPassword ?? ''}
            onChange={(event) =>
              setSettings((prev) => ({ ...prev, wifiPassword: event.target.value }))
            }
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <input
            placeholder="Venmo handle"
            value={settings.venmoHandle ?? ''}
            onChange={(event) => setSettings((prev) => ({ ...prev, venmoHandle: event.target.value }))}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Arrival instructions"
            value={settings.arrivalInstructions ?? ''}
            onChange={(event) =>
              setSettings((prev) => ({ ...prev, arrivalInstructions: event.target.value }))
            }
            className="min-h-20 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Guidebook content"
            value={settings.guidebookText ?? ''}
            onChange={(event) => setSettings((prev) => ({ ...prev, guidebookText: event.target.value }))}
            className="min-h-20 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Nearby recommendations"
            value={settings.nearbyRecommendations ?? ''}
            onChange={(event) =>
              setSettings((prev) => ({ ...prev, nearbyRecommendations: event.target.value }))
            }
            className="min-h-20 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Payment instructions"
            value={settings.paymentInstructions ?? ''}
            onChange={(event) =>
              setSettings((prev) => ({ ...prev, paymentInstructions: event.target.value }))
            }
            className="min-h-20 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Checkout checklist"
            value={settings.checkoutChecklist ?? ''}
            onChange={(event) =>
              setSettings((prev) => ({ ...prev, checkoutChecklist: event.target.value }))
            }
            className="min-h-20 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <div className="rounded-lg border border-[var(--border)] p-3">
            <p className="text-sm font-medium">Guidebook photo URLs</p>
            <div className="mt-2 flex gap-2">
              <input
                placeholder="https://example.com/photo.jpg"
                value={photoUrlInput}
                onChange={(event) => setPhotoUrlInput(event.target.value)}
                className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={addPhotoUrl}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              >
                Add
              </button>
            </div>
            <div className="mt-2 space-y-1">
              {(settings.photoUrls ?? []).map((url) => (
                <div key={url} className="flex items-center justify-between rounded border border-[var(--border)] px-2 py-1 text-xs">
                  <span className="truncate pr-2">{url}</span>
                  <button
                    type="button"
                    onClick={() => removePhotoUrl(url)}
                    className="rounded border border-rose-300 px-2 py-0.5 text-rose-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {(settings.photoUrls ?? []).length === 0 ? (
                <p className="text-xs text-[var(--muted)]">No photos configured yet.</p>
              ) : null}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void saveSettings()}
          className="mt-3 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white"
        >
          Save settings
        </button>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <h2 className="text-base font-semibold">Audit log</h2>
        <div className="mt-3 space-y-2">
          {auditLog.slice(0, 30).map((entry) => (
            <div key={entry.id} className="rounded-lg border border-[var(--border)] p-2 text-xs">
              <p className="font-medium">{entry.actionType}</p>
              <p className="text-[var(--muted)]">
                {entry.actorEmail ?? 'System'} · {new Date(entry.timestamp).toLocaleString()}
              </p>
            </div>
          ))}
          {auditLog.length === 0 ? <p className="text-sm text-[var(--muted)]">No audit entries yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
