import { NextResponse } from 'next/server';

import { requireApiUser } from '@/lib/access';
import { expandIntervalsToBlockedDates, getBlockedIntervals } from '@/lib/availability';
import { parseISODateInput } from '@/lib/date';

export async function GET(request: Request) {
  const { user, error } = await requireApiUser();

  if (error || !user) {
    return error;
  }

  const url = new URL(request.url);
  const rangeStartInput = url.searchParams.get('start');
  const rangeEndInput = url.searchParams.get('end');

  const rangeStart = rangeStartInput ? parseISODateInput(rangeStartInput) : new Date();
  const defaultEnd = new Date(rangeStart);
  defaultEnd.setUTCDate(defaultEnd.getUTCDate() + 120);
  const rangeEnd = rangeEndInput ? parseISODateInput(rangeEndInput) : defaultEnd;

  if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
    return NextResponse.json({ error: 'Invalid date range.' }, { status: 400 });
  }

  const intervals = await getBlockedIntervals({ rangeStart, rangeEnd });
  const blockedDates = expandIntervalsToBlockedDates(intervals);

  return NextResponse.json({ blockedDates });
}
