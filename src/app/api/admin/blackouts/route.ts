import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireApiAdmin } from '@/lib/access';
import { writeAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/db';
import { validateBookingDateRange } from '@/lib/booking-rules';

const blackoutSchema = z.object({
  title: z.string().trim().max(120).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET() {
  const { user, error } = await requireApiAdmin();

  if (error || !user) {
    return error;
  }

  const blackouts = await prisma.blackout.findMany({
    orderBy: [{ startDate: 'asc' }],
  });

  return NextResponse.json({ blackouts });
}

export async function POST(request: Request) {
  const { user, error } = await requireApiAdmin();

  if (error || !user) {
    return error;
  }

  try {
    const input = blackoutSchema.parse(await request.json());
    const { startDate, endDate } = validateBookingDateRange(input.startDate, input.endDate);

    const blackout = await prisma.blackout.create({
      data: {
        title: input.title,
        startDate,
        endDate,
        source: 'LOCAL',
      },
    });

    await writeAuditLog({
      actorEmail: user.email,
      actionType: 'BLACKOUT_CREATED',
      payload: {
        blackoutId: blackout.id,
        startDate: input.startDate,
        endDate: input.endDate,
      },
    });

    return NextResponse.json({ blackout }, { status: 201 });
  } catch (errorValue) {
    if (errorValue instanceof z.ZodError) {
      return NextResponse.json({ error: errorValue.flatten() }, { status: 400 });
    }

    return NextResponse.json({ error: 'Unable to create blackout.' }, { status: 500 });
  }
}
