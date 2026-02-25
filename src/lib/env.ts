function splitCsv(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

export const appEnv = {
  appUrl: process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
  adminEmails: splitCsv(process.env.ADMIN_EMAILS),
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  googleBlackoutCalendarId: process.env.GOOGLE_BLACKOUT_CALENDAR_ID,
  googleBookingCalendarId: process.env.GOOGLE_BOOKING_CALENDAR_ID,
  googleWriteEnabled: process.env.GOOGLE_WRITE_ENABLED === 'true',
  cronSecret: process.env.CRON_SECRET,
  encryptionKey: process.env.ENCRYPTION_KEY,
  propertyDoorCodeEnv: process.env.PROPERTY_DOOR_CODE,
  guestRoomDoorCodeEnv: process.env.GUEST_ROOM_DOOR_CODE,
};
