import { CleaningPlan } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireApiUser } from '@/lib/access';
import { createGuestBooking, listVisibleBookings } from '@/lib/bookings';
import { BookingValidationError, MAX_STAY_NIGHTS } from '@/lib/booking-rules';
import { ConflictError } from '@/lib/bookings';
import { canRevealCodes, getCodeRevealTime } from '@/lib/arrival';
import { getSettings, resolveDoorCodes } from '@/lib/settings';
import { appEnv } from '@/lib/env';

const bookingSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guestName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional(),
  note: z.string().trim().max(500).optional(),
  cleaningPlan: z.nativeEnum(CleaningPlan),
});

export async function GET() {
  const { user, error } = await requireApiUser();

  if (error || !user) {
    return error;
  }

  const bookings = await listVisibleBookings(user);

  if (user.role === 'ADMIN') {
    return NextResponse.json({ bookings });
  }

  const settings = await getSettings();
  const codes = resolveDoorCodes(settings);
  const now = new Date();

  const bookingsWithArrivalDetails = bookings.map((booking) => {
    const revealAt = getCodeRevealTime(booking);
    const revealed = canRevealCodes(booking, now);

    return {
      ...booking,
      arrivalDetails: {
        revealAt: revealAt.toISOString(),
        revealed,
        message: revealed
          ? "Please don't share codes beyond your group."
          : "Door codes unlock 24 hours before check-in. You'll see them here and get an email then.",
        arrivalInstructions: revealed ? settings.arrivalInstructions : null,
        propertyDoorCode: revealed ? codes.propertyDoorCode : null,
        guestRoomDoorCode: revealed ? codes.guestRoomDoorCode : null,
        guidebookUrl: `${appEnv.appUrl}/guidebook`,
      },
    };
  });

  return NextResponse.json({ bookings: bookingsWithArrivalDetails, timezone: 'Server local time' });
}

export async function POST(request: Request) {
  const { user, error } = await requireApiUser();

  if (error || !user) {
    return error;
  }

  try {
    const parsed = bookingSchema.parse(await request.json());
    const booking = await createGuestBooking(user, {
      ...parsed,
      guestEmail: user.email,
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (errorValue) {
    if (errorValue instanceof z.ZodError) {
      return NextResponse.json({ error: errorValue.flatten() }, { status: 400 });
    }

    if (errorValue instanceof BookingValidationError || errorValue instanceof ConflictError) {
      return NextResponse.json(
        {
          error: errorValue.message,
          maxStayNights: MAX_STAY_NIGHTS,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: 'Unable to create booking request.' }, { status: 500 });
  }
}
