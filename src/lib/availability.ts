import { BookingStatus } from '@prisma/client';

import { prisma } from '@/lib/db';
import { eachDateInclusive, isRangeOverlapping, toISODate } from '@/lib/date';
import { getGoogleBusyIntervals } from '@/lib/google-calendar';

export type BlockedInterval = {
  startDate: Date;
  endDate: Date;
  source: 'BOOKING' | 'BLACKOUT' | 'GOOGLE_BUSY';
};

const blockingStatuses: BookingStatus[] = ['NEEDS_APPROVAL', 'APPROVED'];

export async function getBlockedIntervals(args: {
  rangeStart: Date;
  rangeEnd: Date;
  excludeBookingId?: string;
}): Promise<BlockedInterval[]> {
  const [bookings, blackouts, googleBusy] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: { in: blockingStatuses },
        id: args.excludeBookingId ? { not: args.excludeBookingId } : undefined,
        startDate: { lt: args.rangeEnd },
        endDate: { gt: args.rangeStart },
      },
      select: { startDate: true, endDate: true },
    }),
    prisma.blackout.findMany({
      where: {
        startDate: { lt: args.rangeEnd },
        endDate: { gt: args.rangeStart },
      },
      select: { startDate: true, endDate: true },
    }),
    getGoogleBusyIntervals(args.rangeStart, args.rangeEnd),
  ]);

  return [
    ...bookings.map((booking) => ({
      startDate: booking.startDate,
      endDate: booking.endDate,
      source: 'BOOKING' as const,
    })),
    ...blackouts.map((blackout) => ({
      startDate: blackout.startDate,
      endDate: blackout.endDate,
      source: 'BLACKOUT' as const,
    })),
    ...googleBusy.map((busy) => ({
      startDate: busy.start,
      endDate: busy.end,
      source: 'GOOGLE_BUSY' as const,
    })),
  ];
}

export function rangeConflictsWithIntervals(
  startDate: Date,
  endDate: Date,
  intervals: BlockedInterval[],
): boolean {
  return intervals.some((interval) =>
    isRangeOverlapping(startDate, endDate, interval.startDate, interval.endDate),
  );
}

export function expandIntervalsToBlockedDates(intervals: BlockedInterval[]): string[] {
  const blocked = new Set<string>();

  for (const interval of intervals) {
    const intervalStart = new Date(interval.startDate);
    const intervalEnd = new Date(interval.endDate);

    // Booking endDate is checkout and should not be blocked as overnight stay.
    intervalEnd.setUTCDate(intervalEnd.getUTCDate() - 1);

    if (intervalEnd < intervalStart) {
      blocked.add(toISODate(intervalStart));
      continue;
    }

    for (const day of eachDateInclusive(intervalStart, intervalEnd)) {
      blocked.add(day);
    }
  }

  return [...blocked].sort();
}
