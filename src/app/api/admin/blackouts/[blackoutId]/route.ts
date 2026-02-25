import { NextResponse } from 'next/server';

import { requireApiAdmin } from '@/lib/access';
import { writeAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/db';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ blackoutId: string }> },
) {
  const { user, error } = await requireApiAdmin();

  if (error || !user) {
    return error;
  }

  const { blackoutId } = await params;
  const blackout = await prisma.blackout.delete({ where: { id: blackoutId } });

  await writeAuditLog({
    actorEmail: user.email,
    actionType: 'BLACKOUT_DELETED',
    payload: { blackoutId: blackout.id },
  });

  return NextResponse.json({ ok: true });
}
