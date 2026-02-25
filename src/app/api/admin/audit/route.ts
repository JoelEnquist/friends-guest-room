import { NextResponse } from 'next/server';

import { requireApiAdmin } from '@/lib/access';
import { prisma } from '@/lib/db';

export async function GET() {
  const { user, error } = await requireApiAdmin();

  if (error || !user) {
    return error;
  }

  const auditLog = await prisma.auditLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 200,
  });

  return NextResponse.json({ auditLog });
}
