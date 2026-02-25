import { NextResponse } from 'next/server';

import { requireApiAdmin } from '@/lib/access';
import { writeAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/db';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ email: string }> },
) {
  const { user, error } = await requireApiAdmin();

  if (error || !user) {
    return error;
  }

  const { email: encodedEmail } = await params;
  const email = decodeURIComponent(encodedEmail).toLowerCase();

  await prisma.user.update({
    where: { email },
    data: {
      allowed: false,
      role: 'GUEST',
    },
  });

  await writeAuditLog({
    actorEmail: user.email,
    actionType: 'INVITE_REMOVED',
    payload: { email },
  });

  return NextResponse.json({ ok: true });
}
