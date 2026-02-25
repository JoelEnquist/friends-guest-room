import { BookingStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireApiUser } from '@/lib/access';
import {
  cancelBooking,
  rescheduleBooking,
  sendArrivalEmailNow,
  updateBookingStatus,
} from '@/lib/bookings';
import { BookingValidationError } from '@/lib/booking-rules';
import { ConflictError } from '@/lib/bookings';

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('cancel') }),
  z.object({
    action: z.literal('reschedule'),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    note: z.string().trim().max(500).optional(),
    phone: z.string().trim().max(30).optional(),
  }),
  z.object({
    action: z.literal('setStatus'),
    status: z.nativeEnum(BookingStatus),
    adminMessage: z.string().trim().max(500).optional(),
  }),
  z.object({
    action: z.literal('sendArrivalEmailNow'),
  }),
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const { user, error } = await requireApiUser();

  if (error || !user) {
    return error;
  }

  const { bookingId } = await params;

  try {
    const body = actionSchema.parse(await request.json());

    if (body.action === 'cancel') {
      const booking = await cancelBooking({
        bookingId,
        actor: user,
        asAdmin: user.role === 'ADMIN',
      });
      return NextResponse.json({ booking });
    }

    if (body.action === 'reschedule') {
      const booking = await rescheduleBooking({
        bookingId,
        actor: user,
        startDate: body.startDate,
        endDate: body.endDate,
        note: body.note,
        phone: body.phone,
      });

      return NextResponse.json({ booking });
    }

    if (body.action === 'sendArrivalEmailNow') {
      if (user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Only admins can send arrival emails.' }, { status: 403 });
      }

      const booking = await sendArrivalEmailNow({
        bookingId,
        actor: user,
      });

      return NextResponse.json({ booking });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can approve/deny bookings.' }, { status: 403 });
    }

    const booking = await updateBookingStatus({
      bookingId,
      actor: user,
      status: body.status,
      adminMessage: body.adminMessage,
    });

    return NextResponse.json({ booking });
  } catch (errorValue) {
    if (errorValue instanceof z.ZodError) {
      return NextResponse.json({ error: errorValue.flatten() }, { status: 400 });
    }

    if (errorValue instanceof BookingValidationError || errorValue instanceof ConflictError) {
      return NextResponse.json({ error: errorValue.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Unable to update booking.' }, { status: 500 });
  }
}
