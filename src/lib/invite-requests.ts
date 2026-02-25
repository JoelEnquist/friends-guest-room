import { InviteRequest, InviteRequestStatus, User } from '@prisma/client';

import { writeAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { createEmailMagicLink } from '@/lib/magic-link';

export async function createInviteRequest(input: {
  fullName: string;
  email: string;
  socialProfileUrl: string;
  mutualContact: string;
  tripPurpose: string;
  requestedStartDate: Date;
  requestedEndDate: Date;
}): Promise<InviteRequest> {
  const inviteRequest = await prisma.inviteRequest.create({
    data: {
      fullName: input.fullName,
      email: input.email.toLowerCase(),
      socialProfileUrl: input.socialProfileUrl,
      mutualContact: input.mutualContact,
      tripPurpose: input.tripPurpose,
      requestedStartDate: input.requestedStartDate,
      requestedEndDate: input.requestedEndDate,
      status: 'PENDING',
    },
  });

  await writeAuditLog({
    actionType: 'INVITE_REQUEST_CREATED',
    payload: {
      inviteRequestId: inviteRequest.id,
      email: inviteRequest.email,
    },
  });

  return inviteRequest;
}

export async function listInviteRequests(): Promise<InviteRequest[]> {
  return prisma.inviteRequest.findMany({
    orderBy: [{ createdAt: 'desc' }],
  });
}

export async function reviewInviteRequest(args: {
  inviteRequestId: string;
  reviewer: User;
  status: Extract<InviteRequestStatus, 'APPROVED' | 'DENIED'>;
}): Promise<InviteRequest> {
  const inviteRequest = await prisma.inviteRequest.findUnique({ where: { id: args.inviteRequestId } });

  if (!inviteRequest) {
    throw new Error('Invite request not found.');
  }

  const updated = await prisma.inviteRequest.update({
    where: { id: inviteRequest.id },
    data: {
      status: args.status,
      reviewedAt: new Date(),
      reviewedByUserId: args.reviewer.id,
    },
  });

  if (args.status === 'APPROVED') {
    await prisma.user.upsert({
      where: { email: updated.email },
      update: { allowed: true },
      create: {
        email: updated.email,
        name: updated.fullName,
        role: 'GUEST',
        allowed: true,
      },
    });

    const magicLink = await createEmailMagicLink({
      email: updated.email,
      callbackPath: '/calendar',
    });

    await sendEmail({
      to: updated.email,
      subject: "You're invited to The Grow Room",
      text: [
        `Hi ${updated.fullName},`,
        '',
        'You are invited to The Grow Room (invite-only guest room in San Francisco).',
        '',
        `Sign in with this secure link: ${magicLink.url}`,
        `This link expires at ${magicLink.expires.toLocaleString()}.`,
        '',
        'Once signed in, you can view availability and request dates (max 5 nights).',
      ].join('\n'),
    });
  }

  await writeAuditLog({
    actorEmail: args.reviewer.email,
    actionType: `INVITE_REQUEST_${args.status}`,
    payload: {
      inviteRequestId: updated.id,
      email: updated.email,
    },
  });

  return updated;
}
