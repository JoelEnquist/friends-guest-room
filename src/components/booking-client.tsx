'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { BookingStatus, CleaningPlan } from '@prisma/client';

import { CLEANING_CONTRIBUTION_COPY } from '@/lib/email';

type ArrivalDetails = {
  revealAt: string;
  revealed: boolean;
  message: string;
  arrivalInstructions?: string | null;
  propertyDoorCode?: string | null;
  guestRoomDoorCode?: string | null;
  guidebookUrl: string;
};

type BookingRecord = {
  id: string;
  guestEmail: string;
  guestName: string;
  startDate: string;
  endDate: string;
  status: BookingStatus;
  cleaningPlan: CleaningPlan;
  note?: string | null;
  phone?: string | null;
  createdAt: string;
  arrivalDetails?: ArrivalDetails;
};

type Props = {
  initialName: string;
  initialEmail: string;
  showCalendar: boolean;
  showHeading?: boolean;
};

const MAX_NIGHTS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

function toLocalISODate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromLocalISODate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function shiftDate(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfWeek(date: Date): Date {
  const day = date.getDay();
  return shiftDate(date, -day);
}

function formatDate(dateLike: string): string {
  const date = new Date(dateLike);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function statusLabel(status: BookingStatus): string {
  switch (status) {
    case 'NEEDS_APPROVAL':
      return 'Needs approval';
    case 'APPROVED':
      return 'Approved';
    case 'DENIED':
      return 'Denied';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}

function cleaningLabel(plan: CleaningPlan): string {
  return plan === 'SELF_CLEAN'
    ? 'I will reset/clean myself'
    : 'I will make a cleaning contribution ($20 + suggested $10 tip via Venmo/cash)';
}

export function BookingClient({ initialName, initialEmail, showCalendar, showHeading = true }: Props) {
  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => toLocalISODate(today), [today]);

  const [view, setView] = useState<'month' | 'week'>('month');
  const [cursor, setCursor] = useState(startOfMonth(today));
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    startDate: toLocalISODate(shiftDate(today, 2)),
    endDate: toLocalISODate(shiftDate(today, 4)),
    guestName: initialName,
    phone: '',
    note: '',
    cleaningPlan: 'SELF_CLEAN' as CleaningPlan,
  });
  const [rescheduleDrafts, setRescheduleDrafts] = useState<
    Record<string, { startDate: string; endDate: string; phone?: string; note?: string }>
  >({});

  const blockedSet = useMemo(() => new Set(blockedDates), [blockedDates]);

  const validateRange = (startDate: string, endDate: string): string | null => {
    if (!startDate || !endDate) {
      return 'Select both check-in and checkout.';
    }

    const start = fromLocalISODate(startDate);
    const end = fromLocalISODate(endDate);
    const nights = Math.round((end.getTime() - start.getTime()) / DAY_MS);

    if (nights <= 0) {
      return 'Checkout must be after check-in.';
    }

    if (nights > MAX_NIGHTS) {
      return 'Maximum stay is 5 nights.';
    }

    if (blockedSet.has(startDate)) {
      return 'Check-in date is unavailable.';
    }

    const cursorDate = new Date(start);
    while (cursorDate < end) {
      const cursorIso = toLocalISODate(cursorDate);
      if (blockedSet.has(cursorIso)) {
        return 'Selected range includes unavailable dates.';
      }
      cursorDate.setDate(cursorDate.getDate() + 1);
    }

    return null;
  };

  const applyRange = (startDate: string, endDate: string) => {
    const error = validateRange(startDate, endDate);

    if (error) {
      setSelectionError(error);
      return false;
    }

    setFormData((prev) => ({ ...prev, startDate, endDate }));
    setSelectionError(null);
    return true;
  };

  const fetchData = async () => {
    setLoading(true);

    const start = toLocalISODate(startOfMonth(cursor));
    const end = toLocalISODate(shiftDate(endOfMonth(cursor), 60));

    const [availabilityRes, bookingsRes] = await Promise.all([
      fetch(`/api/availability?start=${start}&end=${end}`, { cache: 'no-store' }),
      fetch('/api/bookings', { cache: 'no-store' }),
    ]);

    if (availabilityRes.ok) {
      const availabilityData = await availabilityRes.json();
      setBlockedDates(availabilityData.blockedDates ?? []);
    }

    if (bookingsRes.ok) {
      const bookingData = await bookingsRes.json();
      setBookings(bookingData.bookings ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(cursor);
    const gridStart = startOfWeek(monthStart);
    return Array.from({ length: 42 }).map((_, index) => shiftDate(gridStart, index));
  }, [cursor]);

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(cursor);
    return Array.from({ length: 7 }).map((_, index) => shiftDate(weekStart, index));
  }, [cursor]);

  const viewIncludesToday = useMemo(() => {
    if (view === 'month') {
      return cursor.getMonth() === today.getMonth() && cursor.getFullYear() === today.getFullYear();
    }

    const weekStart = startOfWeek(cursor);
    const weekEnd = shiftDate(weekStart, 6);
    return today >= weekStart && today <= weekEnd;
  }, [cursor, today, view]);

  const onDateTap = (dateIso: string) => {
    if (blockedSet.has(dateIso)) {
      setSelectionError('Unavailable dates cannot be selected.');
      return;
    }

    const { startDate, endDate } = formData;

    if (!startDate || endDate) {
      setFormData((prev) => ({ ...prev, startDate: dateIso, endDate: '' }));
      setSelectionError('Now pick a checkout date.');
      return;
    }

    if (dateIso < startDate) {
      setFormData((prev) => ({ ...prev, startDate: dateIso, endDate: '' }));
      setSelectionError('Updated check-in. Pick checkout next.');
      return;
    }

    if (dateIso === startDate) {
      const forcedCheckout = toLocalISODate(shiftDate(fromLocalISODate(dateIso), 1));
      const ok = applyRange(dateIso, forcedCheckout);
      if (ok) {
        setSelectionError('Checkout must be after check-in. We set checkout to the next day.');
      }
      return;
    }

    applyRange(startDate, dateIso);
  };

  const submitBooking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage(null);

    const error = validateRange(formData.startDate, formData.endDate);
    if (error) {
      setSelectionError(error);
      return;
    }

    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (!response.ok) {
      setStatusMessage(data.error ?? 'Could not submit request.');
      return;
    }

    setStatusMessage('Request received. You can track status below.');
    await fetchData();
  };

  const cancelBooking = async (bookingId: string) => {
    const response = await fetch(`/api/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel' }),
    });

    const data = await response.json();

    if (!response.ok) {
      setStatusMessage(data.error ?? 'Unable to cancel booking.');
      return;
    }

    setStatusMessage('Booking cancelled.');
    await fetchData();
  };

  const rescheduleBooking = async (bookingId: string) => {
    const draft = rescheduleDrafts[bookingId];

    if (!draft?.startDate || !draft?.endDate) {
      setStatusMessage('Pick new check-in and checkout dates first.');
      return;
    }

    const response = await fetch(`/api/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reschedule', ...draft }),
    });

    const data = await response.json();

    if (!response.ok) {
      setStatusMessage(data.error ?? 'Unable to reschedule booking.');
      return;
    }

    setStatusMessage('Booking rescheduled. If it was approved, it now needs approval again.');
    await fetchData();
  };

  const renderDateCell = (date: Date) => {
    const key = toLocalISODate(date);
    const blocked = blockedSet.has(key);
    const isToday = key === todayIso;
    const isStart = key === formData.startDate;
    const isEnd = key === formData.endDate;
    const inRange =
      Boolean(formData.startDate && formData.endDate) &&
      key > formData.startDate &&
      key < formData.endDate;

    const classes = blocked
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : isStart || isEnd
        ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
        : inRange
          ? 'border-[var(--accent-soft)] bg-[var(--accent-soft)] text-[var(--accent)]'
          : 'border-[var(--border)] bg-white text-[var(--text)]';

    return (
      <button
        key={key}
        type="button"
        disabled={blocked}
        onClick={() => onDateTap(key)}
        className={`min-h-16 rounded-lg border p-2 text-center text-xs sm:text-sm ${classes} disabled:cursor-not-allowed`}
      >
        <div className="font-semibold">{date.getDate()}</div>
        <div className="mt-1 text-[10px] sm:text-xs">
          {blocked ? 'Unavailable' : isStart ? 'Check-in' : isEnd ? 'Checkout' : isToday ? 'Today' : 'Open'}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-5">
      {showHeading ? (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Request a stay at The Grow Room</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Friends-only scheduling. You can cancel or reschedule on your own anytime.
          </p>
        </section>
      ) : null}

      {showCalendar ? (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Availability calendar</h3>
              <p className="text-xs text-[var(--muted)]">Today: {formatDate(todayIso)}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setView('month')}
                className={`rounded-full px-3 py-1 text-xs ${
                  view === 'month' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--accent-soft)]'
                }`}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => setView('week')}
                className={`rounded-full px-3 py-1 text-xs ${
                  view === 'week' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--accent-soft)]'
                }`}
              >
                Week
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() =>
                setCursor(
                  view === 'month'
                    ? new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)
                    : shiftDate(cursor, -7),
                )
              }
              className="rounded-lg border border-[var(--border)] px-3 py-1 text-sm"
            >
              Prev
            </button>
            <p className="text-sm font-medium">
              {cursor.toLocaleDateString(undefined, {
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <button
              type="button"
              onClick={() =>
                setCursor(
                  view === 'month'
                    ? new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
                    : shiftDate(cursor, 7),
                )
              }
              className="rounded-lg border border-[var(--border)] px-3 py-1 text-sm"
            >
              Next
            </button>
          </div>

          {!viewIncludesToday ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setCursor(view === 'month' ? startOfMonth(today) : today)}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs"
              >
                Jump to today
              </button>
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {(view === 'month' ? monthDays : weekDays).map(renderDateCell)}
          </div>

          {selectionError ? <p className="mt-3 text-sm text-rose-700">{selectionError}</p> : null}
        </section>
      ) : null}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <form className="grid gap-3" onSubmit={submitBooking}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Check-in</span>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(event) => {
                  const nextStart = event.target.value;
                  setFormData((prev) => ({ ...prev, startDate: nextStart }));

                  if (!formData.endDate) {
                    setSelectionError(null);
                    return;
                  }

                  const error = validateRange(nextStart, formData.endDate);
                  setSelectionError(error);
                }}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Checkout</span>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(event) => {
                  const nextEnd = event.target.value;
                  setFormData((prev) => ({ ...prev, endDate: nextEnd }));
                  const error = validateRange(formData.startDate, nextEnd);
                  setSelectionError(error);
                }}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
              />
            </label>
          </div>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Full name</span>
            <input
              type="text"
              required
              value={formData.guestName}
              onChange={(event) => setFormData((prev) => ({ ...prev, guestName: event.target.value }))}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Email</span>
            <input
              type="email"
              value={initialEmail}
              disabled
              className="w-full rounded-lg border border-[var(--border)] bg-slate-50 px-3 py-2 text-[var(--muted)]"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Phone (optional)</span>
            <input
              type="text"
              value={formData.phone}
              onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Short note (optional)</span>
            <textarea
              value={formData.note}
              onChange={(event) => setFormData((prev) => ({ ...prev, note: event.target.value }))}
              className="min-h-20 w-full rounded-lg border border-[var(--border)] px-3 py-2"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Cleaning plan</span>
            <select
              value={formData.cleaningPlan}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  cleaningPlan: event.target.value as CleaningPlan,
                }))
              }
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
              required
            >
              <option value="SELF_CLEAN">I will reset/clean myself</option>
              <option value="PAY_VENMO_OR_CASH">
                I will make a cleaning contribution ($20 + suggested $10 tip via Venmo/cash)
              </option>
            </select>
          </label>

          <p className="text-xs text-[var(--muted)]">{CLEANING_CONTRIBUTION_COPY}</p>

          <button className="rounded-lg bg-[var(--accent)] px-4 py-2 text-white" type="submit">
            Submit booking request
          </button>
          <p className="text-xs text-[var(--muted)]">Maximum stay length is 5 nights.</p>
          {statusMessage ? <p className="text-sm text-[var(--accent)]">{statusMessage}</p> : null}
        </form>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold">Your booking requests</h3>
          {loading ? <span className="text-xs text-[var(--muted)]">Refreshing...</span> : null}
        </div>

        {bookings.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No booking requests yet.</p>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <article key={booking.id} className="rounded-xl border border-[var(--border)] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                    </p>
                    <p className="text-xs text-[var(--muted)]">{cleaningLabel(booking.cleaningPlan)}</p>
                  </div>
                  <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs text-[var(--accent)]">
                    {statusLabel(booking.status)}
                  </span>
                </div>

                {booking.status === 'APPROVED' && booking.arrivalDetails ? (
                  <div className="mt-3 rounded-lg border border-[var(--border)] bg-slate-50 p-3 text-sm">
                    {booking.arrivalDetails.revealed ? (
                      <div className="space-y-1">
                        <p className="font-medium">Arrival details</p>
                        {booking.arrivalDetails.arrivalInstructions ? (
                          <p>{booking.arrivalDetails.arrivalInstructions}</p>
                        ) : null}
                        <p>Property door code: {booking.arrivalDetails.propertyDoorCode ?? '(pending)'}</p>
                        <p>Guest room door code: {booking.arrivalDetails.guestRoomDoorCode ?? '(pending)'}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {booking.arrivalDetails.message}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p>{booking.arrivalDetails.message}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          Unlocks on {new Date(booking.arrivalDetails.revealAt).toLocaleString()} (server local time).
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input
                    type="date"
                    defaultValue={booking.startDate.slice(0, 10)}
                    onChange={(event) =>
                      setRescheduleDrafts((prev) => ({
                        ...prev,
                        [booking.id]: {
                          startDate: event.target.value,
                          endDate: prev[booking.id]?.endDate ?? booking.endDate.slice(0, 10),
                          note: prev[booking.id]?.note ?? booking.note ?? '',
                          phone: prev[booking.id]?.phone ?? booking.phone ?? '',
                        },
                      }))
                    }
                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                  />
                  <input
                    type="date"
                    defaultValue={booking.endDate.slice(0, 10)}
                    onChange={(event) =>
                      setRescheduleDrafts((prev) => ({
                        ...prev,
                        [booking.id]: {
                          startDate: prev[booking.id]?.startDate ?? booking.startDate.slice(0, 10),
                          endDate: event.target.value,
                          note: prev[booking.id]?.note ?? booking.note ?? '',
                          phone: prev[booking.id]?.phone ?? booking.phone ?? '',
                        },
                      }))
                    }
                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm"
                    onClick={() => void rescheduleBooking(booking.id)}
                  >
                    Reschedule
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm text-rose-700"
                    onClick={() => void cancelBooking(booking.id)}
                  >
                    Cancel
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
