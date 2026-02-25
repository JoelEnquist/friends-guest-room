import { BookingStatus, CleaningPlan } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireApiAdmin } from '@/lib/access';
import { createAdminBooking } from '@/lib/bookings';
import { prisma } from '@/lib/db';
import { BookingValidationError } from '@/lib/booking-rules';
import { ConflictError } from '@/lib/bookings';

const manualBookingSchema = z.object({
  guestName: z.string().trim().min(2).max(120),
  guestEmail: z.string().trim().email(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  phone: z.string().trim().max(30).optional(),
  note: z.string().trim().max(500).optional(),
  cleaningPlan: z.nativeEnum(CleaningPlan),
  status: z.nativeEnum(BookingStatus).optional(),
});

export async function GET() {
  const { user, error } = await requireApiAdmin();

  if (error || !user) {
    return error;
  }

  const bookings = await prisma.booking.findMany({
    orderBy: [{ startDate: 'asc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json({ bookings });
}

export async function POST(request: Request) {
  const { user, error } = await requireApiAdmin();

  if (error || !user) {
    return error;
  }

  try {
    const input = manualBookingSchema.parse(await request.json());
    const booking = await createAdminBooking(user, input);
    return NextResponse.json({ booking }, { status: 201 });
  } catch (errorValue) {
    if (errorValue instanceof z.ZodError) {
      return NextResponse.json({ error: errorValue.flatten() }, { status: 400 });
    }

    if (errorValue instanceof BookingValidationError || errorValue instanceof ConflictError) {
      return NextResponse.json({ error: errorValue.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Unable to create admin booking.' }, { status: 500 });
  }
}
