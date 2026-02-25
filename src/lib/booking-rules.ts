import { BookingStatus } from '@prisma/client';

import { parseISODateInput, nightsBetween, toISODate } from '@/lib/date';

export const MAX_STAY_NIGHTS = 5;

export class BookingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BookingValidationError';
  }
}

export function validateBookingDateRange(startDateInput: string, endDateInput: string): {
  startDate: Date;
  endDate: Date;
  nights: number;
} {
  const startDate = parseISODateInput(startDateInput);
  const endDate = parseISODateInput(endDateInput);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new BookingValidationError('Invalid booking dates.');
  }

  const nights = nightsBetween(startDate, endDate);

  if (nights <= 0) {
    throw new BookingValidationError('Checkout must be after check-in.');
  }

  if (nights > MAX_STAY_NIGHTS) {
    throw new BookingValidationError(`Maximum stay is ${MAX_STAY_NIGHTS} nights.`);
  }

  return { startDate, endDate, nights };
}

export function bookingBlocksAvailability(status: BookingStatus): boolean {
  return status === BookingStatus.NEEDS_APPROVAL || status === BookingStatus.APPROVED;
}

export function formatBookingWindow(startDate: Date, endDate: Date): string {
  return `${toISODate(startDate)} to ${toISODate(endDate)}`;
}
