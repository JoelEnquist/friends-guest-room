import { BookingStatus } from '@prisma/client';
import { NextResponse } from 'next/server';

import { sendDueArrivalEmails } from '@/lib/bookings';
import { prisma } from '@/lib/db';
import { appEnv } from '@/lib/env';
import { sendCheckoutReminderEmail } from '@/lib/email';
import { getSettings } from '@/lib/settings';
import { writeAuditLog } from '@/lib/audit';

async function handleRequest(request: Request) {
  const authHeader = request.headers.get('authorization');
  const vercelCronHeader = request.headers.get('x-vercel-cron');

  const cronAuthorized =
    Boolean(vercelCronHeader) ||
    (Boolean(appEnv.cronSecret) && authHeader === `Bearer ${appEnv.cronSecret}`);

  if (!cronAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const tomorrowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const dayAfterTomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2),
  );

  const [settings, dueBookings, arrivalEmailsSent] = await Promise.all([
    getSettings(),
    prisma.booking.findMany({
      where: {
        status: BookingStatus.APPROVED,
        endDate: {
          gte: tomorrowStart,
          lt: dayAfterTomorrow,
        },
        reminderSentAt: null,
      },
    }),
    sendDueArrivalEmails(now),
  ]);

  await Promise.all(
    dueBookings.map(async (booking) => {
      await sendCheckoutReminderEmail({ booking, settings });
      await prisma.booking.update({
        where: { id: booking.id },
        data: { reminderSentAt: new Date() },
      });
    }),
  );

  await writeAuditLog({
    actionType: 'CHECKOUT_REMINDER_CRON',
    payload: { remindersSent: dueBookings.length, arrivalEmailsSent },
  });

  return NextResponse.json({
    remindersSent: dueBookings.length,
    arrivalEmailsSent,
    timezone: 'Server local time',
  });
}

export async function POST(request: Request) {
  return handleRequest(request);
}

export async function GET(request: Request) {
  return handleRequest(request);
}
