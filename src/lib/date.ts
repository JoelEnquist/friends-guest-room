export const DAY_MS = 24 * 60 * 60 * 1000;

export function parseISODateInput(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toISODate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function nightsBetween(startDate: Date, endDate: Date): number {
  return Math.round((endDate.getTime() - startDate.getTime()) / DAY_MS);
}

export function isRangeOverlapping(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  return startA < endB && endA > startB;
}

export function eachDateInclusive(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    dates.push(toISODate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}
