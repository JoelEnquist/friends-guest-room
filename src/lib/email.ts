import { Booking, BookingStatus, CleaningPlan, Settings } from '@prisma/client';

import { appEnv } from '@/lib/env';
import { toISODate } from '@/lib/date';

type EmailPayload = {
  to: string | string[];
  subject: string;
  text: string;
};

export const CLEANING_CONTRIBUTION_COPY =
  'If you choose the cleaning contribution, 100% goes directly to our maid for turnover cleaning - we don\'t keep any of it.';

export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!appEnv.resendApiKey || !appEnv.emailFrom) {
    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
    console.log('DEV_EMAIL_FALLBACK');
    console.log(`To: ${recipients.join(', ')}`);
    console.log(`Subject: ${payload.subject}`);
    console.log(payload.text);
    return;
  }

  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${appEnv.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: appEnv.emailFrom,
      to: recipients,
      subject: payload.subject,
      text: payload.text,
    }),
  });
}

function cleaningPlanLabel(cleaningPlan: CleaningPlan): string {
  return cleaningPlan === 'SELF_CLEAN'
    ? 'I will reset/clean myself'
    : 'I will make a cleaning contribution ($20 + suggested $10 tip via Venmo/cash)';
}

export async function sendBookingRequestReceivedEmail(booking: Booking): Promise<void> {
  await sendEmail({
    to: booking.guestEmail,
    subject: 'The Grow Room request received',
    text: [
      'Your request is in queue.',
      '',
      `Stay: ${toISODate(booking.startDate)} to ${toISODate(booking.endDate)}`,
      'Status: Needs approval',
      `Cleaning plan: ${cleaningPlanLabel(booking.cleaningPlan)}`,
      CLEANING_CONTRIBUTION_COPY,
      '',
      'We will follow up soon.',
    ].join('\n'),
  });
}

export async function sendBookingApprovedEmail(args: {
  booking: Booking;
  settings: Settings;
  guidebookUrl: string;
}): Promise<void> {
  const { booking, settings, guidebookUrl } = args;

  await sendEmail({
    to: booking.guestEmail,
    subject: 'The Grow Room booking approved',
    text: [
      `Confirmed: ${toISODate(booking.startDate)} to ${toISODate(booking.endDate)}`,
      '',
      settings.arrivalInstructions ??
        'You will use two code-locked doors: property entrance, then courtyard to guest room.',
      '',
      'Arrival details (including door codes) will be sent 24 hours before check-in.',
      '',
      `Guidebook: ${guidebookUrl}`,
      '',
      `Checkout checklist:\n${settings.checkoutChecklist ?? 'Please reset the room before checkout.'}`,
      '',
      `Cleaning plan: ${cleaningPlanLabel(booking.cleaningPlan)}`,
      CLEANING_CONTRIBUTION_COPY,
    ].join('\n'),
  });
}

export async function sendArrivalDetailsEmail(args: {
  booking: Booking;
  settings: Settings;
  guidebookUrl: string;
  propertyDoorCode: string | null;
  guestRoomDoorCode: string | null;
}): Promise<void> {
  const { booking, settings, guidebookUrl, propertyDoorCode, guestRoomDoorCode } = args;

  await sendEmail({
    to: booking.guestEmail,
    subject: 'The Grow Room arrival details',
    text: [
      `Arrival details for your stay: ${toISODate(booking.startDate)} to ${toISODate(booking.endDate)}`,
      '',
      settings.arrivalInstructions ??
        'You will use two code-locked doors: property entrance, then courtyard to guest room.',
      `Property door code: ${propertyDoorCode ?? '(host will share manually)'}`,
      `Guest room door code: ${guestRoomDoorCode ?? '(host will share manually)'}`,
      '',
      `Guidebook: ${guidebookUrl}`,
      '',
      'Please don\'t share codes beyond your group.',
    ].join('\n'),
  });
}

export async function sendBookingDeniedEmail(booking: Booking): Promise<void> {
  await sendEmail({
    to: booking.guestEmail,
    subject: 'The Grow Room booking update',
    text: `Thanks for requesting The Grow Room.\n\nUnfortunately we cannot host this stay: ${toISODate(booking.startDate)} to ${toISODate(booking.endDate)}.\n\nYou can submit a new request for other dates anytime.`,
  });
}

export async function sendAdminNewRequestEmail(args: {
  adminEmails: string[];
  booking: Booking;
}): Promise<void> {
  if (!args.adminEmails.length) {
    return;
  }

  await sendEmail({
    to: args.adminEmails,
    subject: 'New The Grow Room booking request',
    text: [
      `Guest: ${args.booking.guestName} (${args.booking.guestEmail})`,
      `Dates: ${toISODate(args.booking.startDate)} to ${toISODate(args.booking.endDate)}`,
      `Status: ${args.booking.status}`,
    ].join('\n'),
  });
}

export async function sendCheckoutReminderEmail(args: {
  booking: Booking;
  settings: Settings;
}): Promise<void> {
  await sendEmail({
    to: args.booking.guestEmail,
    subject: 'The Grow Room checkout reminder (24h)',
    text: [
      `Checkout is tomorrow (${toISODate(args.booking.endDate)}).`,
      '',
      `Checklist:\n${args.settings.checkoutChecklist ?? 'Please reset the room before checkout.'}`,
      '',
      `Cleaning plan selected: ${cleaningPlanLabel(args.booking.cleaningPlan)}`,
      CLEANING_CONTRIBUTION_COPY,
      args.settings.paymentInstructions ? `\n${args.settings.paymentInstructions}` : '',
    ].join('\n'),
  });
}

export function statusLabel(status: BookingStatus): string {
  switch (status) {
    case 'NEEDS_APPROVAL':
      return 'Needs approval';
    case 'APPROVED':
      return 'Approved';
    case 'DENIED':
      return 'Denied';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}
