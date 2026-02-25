import { google } from 'googleapis';

import { appEnv } from '@/lib/env';

type CalendarBusyInterval = {
  start: Date;
  end: Date;
};

function getOAuthClient() {
  if (!appEnv.googleClientId || !appEnv.googleClientSecret || !appEnv.googleRefreshToken) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(appEnv.googleClientId, appEnv.googleClientSecret);
  oauth2Client.setCredentials({ refresh_token: appEnv.googleRefreshToken });
  return oauth2Client;
}

function getCalendarApi() {
  const auth = getOAuthClient();

  if (!auth) {
    return null;
  }

  return google.calendar({ version: 'v3', auth });
}

export async function getGoogleBusyIntervals(
  rangeStart: Date,
  rangeEnd: Date,
): Promise<CalendarBusyInterval[]> {
  if (!appEnv.googleBlackoutCalendarId) {
    return [];
  }

  const calendar = getCalendarApi();

  if (!calendar) {
    return [];
  }

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: rangeStart.toISOString(),
      timeMax: rangeEnd.toISOString(),
      items: [{ id: appEnv.googleBlackoutCalendarId }],
    },
  });

  const busyEntries = response.data.calendars?.[appEnv.googleBlackoutCalendarId]?.busy ?? [];

  return busyEntries
    .map((entry) => {
      if (!entry.start || !entry.end) {
        return null;
      }

      return {
        start: new Date(entry.start),
        end: new Date(entry.end),
      };
    })
    .filter((interval): interval is CalendarBusyInterval => Boolean(interval));
}

export async function createOrUpdateGoogleBookingEvent(args: {
  bookingId: string;
  title: string;
  startDate: Date;
  endDate: Date;
  eventId?: string | null;
}): Promise<string | null> {
  if (!appEnv.googleWriteEnabled || !appEnv.googleBookingCalendarId) {
    return null;
  }

  const calendar = getCalendarApi();

  if (!calendar) {
    return null;
  }

  const requestBody = {
    summary: args.title,
    description: `The Grow Room booking (${args.bookingId})`,
    start: {
      date: args.startDate.toISOString().slice(0, 10),
    },
    end: {
      date: args.endDate.toISOString().slice(0, 10),
    },
  };

  if (args.eventId) {
    const updated = await calendar.events.update({
      calendarId: appEnv.googleBookingCalendarId,
      eventId: args.eventId,
      requestBody,
    });
    return updated.data.id ?? args.eventId;
  }

  const created = await calendar.events.insert({
    calendarId: appEnv.googleBookingCalendarId,
    requestBody,
  });

  return created.data.id ?? null;
}

export async function deleteGoogleBookingEvent(eventId?: string | null): Promise<void> {
  if (!eventId || !appEnv.googleWriteEnabled || !appEnv.googleBookingCalendarId) {
    return;
  }

  const calendar = getCalendarApi();

  if (!calendar) {
    return;
  }

  await calendar.events.delete({
    calendarId: appEnv.googleBookingCalendarId,
    eventId,
  });
}
