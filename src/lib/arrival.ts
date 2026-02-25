import { BookingStatus } from '@prisma/client';

const DAY_MS = 24 * 60 * 60 * 1000;

type BookingForReveal = {
  status: BookingStatus;
  startDate: Date;
};

export function getCodeRevealTime(booking: BookingForReveal): Date {
  return new Date(booking.startDate.getTime() - DAY_MS);
}

export function canRevealCodes(booking: BookingForReveal, now: Date = new Date()): boolean {
  return booking.status === 'APPROVED' && now.getTime() >= getCodeRevealTime(booking).getTime();
}
