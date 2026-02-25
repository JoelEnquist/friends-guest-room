import {
  Booking,
  BookingSource,
  BookingStatus,
  CleaningPlan,
  Prisma,
  Role,
  User,
} from '@prisma/client';

import { writeAuditLog } from '@/lib/audit';
import {
  BookingValidationError,
  formatBookingWindow,
  validateBookingDateRange,
} from '@/lib/booking-rules';
import { getBlockedIntervals, rangeConflictsWithIntervals } from '@/lib/availability';
import {
  sendArrivalDetailsEmail,
  sendAdminNewRequestEmail,
  sendBookingApprovedEmail,
  sendBookingDeniedEmail,
  sendBookingRequestReceivedEmail,
} from '@/lib/email';
import { appEnv } from '@/lib/env';
import {
  createOrUpdateGoogleBookingEvent,
  deleteGoogleBookingEvent,
} from '@/lib/google-calendar';
import { lockProvider } from '@/lib/lock-provider';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { canRevealCodes } from '@/lib/arrival';

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

type BookingRequestInput = {
  startDate: string;
  endDate: string;
  guestName: string;
  guestEmail: string;
  phone?: string;
  note?: string;
  cleaningPlan: CleaningPlan;
};

export async function ensureRangeAvailable(
  startDate: Date,
  endDate: Date,
  excludeBookingId?: string,
): Promise<void> {
  const intervals = await getBlockedIntervals({
    rangeStart: startDate,
    rangeEnd: endDate,
    excludeBookingId,
  });

  if (rangeConflictsWithIntervals(startDate, endDate, intervals)) {
    throw new ConflictError('These dates are unavailable. Please choose different dates.');
  }
}

export async function createGuestBooking(user: User, input: BookingRequestInput): Promise<Booking> {
  const { startDate, endDate } = validateBookingDateRange(input.startDate, input.endDate);
  await ensureRangeAvailable(startDate, endDate);

  const booking = await prisma.booking.create({
    data: {
      guestUserId: user.id,
      guestEmail: user.email,
      guestName: input.guestName,
      phone: input.phone,
      note: input.note,
      startDate,
      endDate,
      cleaningPlan: input.cleaningPlan,
      status: 'NEEDS_APPROVAL',
      source: 'GUEST_REQUEST',
    },
  });

  await Promise.all([
    sendBookingRequestReceivedEmail(booking),
    sendAdminNewRequestEmail({ adminEmails: appEnv.adminEmails, booking }),
    writeAuditLog({
      actorEmail: user.email,
      actionType: 'BOOKING_CREATED',
      payload: {
        bookingId: booking.id,
        window: formatBookingWindow(startDate, endDate),
      },
    }),
  ]);

  return booking;
}

export async function createAdminBooking(
  user: User,
  input: BookingRequestInput & { status?: BookingStatus; source?: BookingSource },
): Promise<Booking> {
  const { startDate, endDate } = validateBookingDateRange(input.startDate, input.endDate);
  await ensureRangeAvailable(startDate, endDate);

  const status = input.status ?? 'APPROVED';

  const booking = await prisma.booking.create({
    data: {
      guestEmail: input.guestEmail.toLowerCase(),
      guestName: input.guestName,
      phone: input.phone,
      note: input.note,
      startDate,
      endDate,
      cleaningPlan: input.cleaningPlan,
      status,
      source: input.source ?? 'ADMIN_MANUAL',
    },
  });

  if (status === 'APPROVED') {
    const googleEventId = await createOrUpdateGoogleBookingEvent({
      bookingId: booking.id,
      title: `The Grow Room: ${input.guestName}`,
      startDate,
      endDate,
    });

    if (googleEventId) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { googleEventId },
      });
      booking.googleEventId = googleEventId;
    }
  }

  await writeAuditLog({
    actorEmail: user.email,
    actionType: 'ADMIN_BOOKING_CREATED',
    payload: {
      bookingId: booking.id,
      window: formatBookingWindow(startDate, endDate),
      status,
    },
  });

  return booking;
}

export async function updateBookingStatus(args: {
  bookingId: string;
  actor: User;
  status: BookingStatus;
  adminMessage?: string;
}): Promise<Booking> {
  const booking = await prisma.booking.findUnique({ where: { id: args.bookingId } });

  if (!booking) {
    throw new BookingValidationError('Booking not found.');
  }

  let googleEventId = booking.googleEventId;
  if (args.status === 'APPROVED') {
    googleEventId = await createOrUpdateGoogleBookingEvent({
      bookingId: booking.id,
      title: `The Grow Room: ${booking.guestName}`,
      startDate: booking.startDate,
      endDate: booking.endDate,
      eventId: booking.googleEventId,
    });
  } else {
    await deleteGoogleBookingEvent(booking.googleEventId);
    googleEventId = null;
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: args.status,
      adminMessage: args.adminMessage,
      googleEventId,
      arrivalEmailSentAt:
        args.status === 'APPROVED' && booking.status !== 'APPROVED'
          ? null
          : booking.arrivalEmailSentAt,
    },
  });

  if (args.status === 'APPROVED') {
    const settings = await getSettings();
    await sendBookingApprovedEmail({
      booking: updated,
      settings,
      guidebookUrl: `${appEnv.appUrl}/guidebook`,
    });
  }

  if (args.status === 'DENIED') {
    await sendBookingDeniedEmail(updated);
  }

  await writeAuditLog({
    actorEmail: args.actor.email,
    actionType: `BOOKING_${args.status}`,
    payload: {
      bookingId: booking.id,
      previousStatus: booking.status,
      adminMessage: args.adminMessage,
    },
  });

  return updated;
}

export async function cancelBooking(args: {
  bookingId: string;
  actor: User;
  asAdmin: boolean;
}): Promise<Booking> {
  const booking = await prisma.booking.findUnique({ where: { id: args.bookingId } });

  if (!booking) {
    throw new BookingValidationError('Booking not found.');
  }

  if (!args.asAdmin && booking.guestEmail.toLowerCase() !== args.actor.email.toLowerCase()) {
    throw new BookingValidationError('Not permitted to cancel this booking.');
  }

  await deleteGoogleBookingEvent(booking.googleEventId);

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: 'CANCELLED',
      googleEventId: null,
    },
  });

  await writeAuditLog({
    actorEmail: args.actor.email,
    actionType: 'BOOKING_CANCELLED',
    payload: {
      bookingId: booking.id,
      previousStatus: booking.status,
    },
  });

  return updated;
}

export async function rescheduleBooking(args: {
  bookingId: string;
  actor: User;
  startDate: string;
  endDate: string;
  note?: string;
  phone?: string;
}): Promise<Booking> {
  const booking = await prisma.booking.findUnique({ where: { id: args.bookingId } });

  if (!booking) {
    throw new BookingValidationError('Booking not found.');
  }

  const isOwner = booking.guestEmail.toLowerCase() === args.actor.email.toLowerCase();
  const isAdmin = args.actor.role === Role.ADMIN;

  if (!isOwner && !isAdmin) {
    throw new BookingValidationError('Not permitted to reschedule this booking.');
  }

  const { startDate, endDate } = validateBookingDateRange(args.startDate, args.endDate);
  await ensureRangeAvailable(startDate, endDate, booking.id);

  if (booking.status === 'APPROVED') {
    await deleteGoogleBookingEvent(booking.googleEventId);
  }

  const nextStatus: BookingStatus = booking.status === 'APPROVED' ? 'NEEDS_APPROVAL' : booking.status;

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      startDate,
      endDate,
      note: args.note,
      phone: args.phone,
      status: nextStatus,
      googleEventId: null,
      reminderSentAt: null,
      arrivalEmailSentAt: null,
    },
  });

  await writeAuditLog({
    actorEmail: args.actor.email,
    actionType: 'BOOKING_RESCHEDULED',
    payload: {
      bookingId: booking.id,
      previousStatus: booking.status,
      nextStatus,
      newWindow: formatBookingWindow(startDate, endDate),
    },
  });

  return updated;
}

export async function listVisibleBookings(user: User): Promise<Booking[]> {
  const where: Prisma.BookingWhereInput =
    user.role === 'ADMIN' ? {} : { guestEmail: user.email.toLowerCase() };

  return prisma.booking.findMany({
    where,
    orderBy: [{ startDate: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function sendArrivalEmailNow(args: {
  bookingId: string;
  actor: User;
}): Promise<Booking> {
  const booking = await prisma.booking.findUnique({ where: { id: args.bookingId } });

  if (!booking) {
    throw new BookingValidationError('Booking not found.');
  }

  if (booking.status !== 'APPROVED') {
    throw new BookingValidationError('Arrival email can only be sent for approved bookings.');
  }

  const settings = await getSettings();
  const codes = await lockProvider.getCredentialsForApprovedBooking();

  await sendArrivalDetailsEmail({
    booking,
    settings,
    guidebookUrl: `${appEnv.appUrl}/guidebook`,
    propertyDoorCode: codes.propertyDoorCode,
    guestRoomDoorCode: codes.guestRoomDoorCode,
  });

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      arrivalEmailSentAt: new Date(),
    },
  });

  await writeAuditLog({
    actorEmail: args.actor.email,
    actionType: 'ARRIVAL_EMAIL_SENT_MANUAL',
    payload: { bookingId: booking.id },
  });

  return updated;
}

export async function sendDueArrivalEmails(now: Date = new Date()): Promise<number> {
  const settings = await getSettings();
  const codes = await lockProvider.getCredentialsForApprovedBooking();
  const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const candidates = await prisma.booking.findMany({
    where: {
      status: 'APPROVED',
      arrivalEmailSentAt: null,
      startDate: {
        gt: now,
        lte: horizon,
      },
    },
  });

  let sentCount = 0;

  for (const booking of candidates) {
    if (!canRevealCodes(booking, now)) {
      continue;
    }

    await sendArrivalDetailsEmail({
      booking,
      settings,
      guidebookUrl: `${appEnv.appUrl}/guidebook`,
      propertyDoorCode: codes.propertyDoorCode,
      guestRoomDoorCode: codes.guestRoomDoorCode,
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { arrivalEmailSentAt: new Date() },
    });
    sentCount += 1;
  }

  if (sentCount > 0) {
    await writeAuditLog({
      actionType: 'ARRIVAL_EMAIL_SENT_CRON',
      payload: { sentCount },
    });
  }

  return sentCount;
}
