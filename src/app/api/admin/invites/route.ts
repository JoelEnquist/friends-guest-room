import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireApiAdmin } from '@/lib/access';
import { writeAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/db';

const inviteSchema = z.object({
  email: z.string().trim().email(),
  role: z.nativeEnum(Role).default(Role.GUEST),
  name: z.string().trim().max(120).optional(),
});

export async function GET() {
  const { user, error } = await requireApiAdmin();

  if (error || !user) {
    return error;
  }

  const invites = await prisma.user.findMany({
    where: { allowed: true },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      allowed: true,
      createdAt: true,
    },
    orderBy: [{ role: 'desc' }, { email: 'asc' }],
  });

  return NextResponse.json({ invites });
}

export async function POST(request: Request) {
  const { user, error } = await requireApiAdmin();

  if (error || !user) {
    return error;
  }

  try {
    const input = inviteSchema.parse(await request.json());
    const email = input.email.toLowerCase();

    const invited = await prisma.user.upsert({
      where: { email },
      update: {
        allowed: true,
        role: input.role,
        name: input.name,
      },
      create: {
        email,
        name: input.name,
        allowed: true,
        role: input.role,
      },
    });

    await writeAuditLog({
      actorEmail: user.email,
      actionType: 'INVITE_ADDED',
      payload: { email, role: input.role },
    });

    return NextResponse.json({ invite: invited }, { status: 201 });
  } catch (errorValue) {
    if (errorValue instanceof z.ZodError) {
      return NextResponse.json({ error: errorValue.flatten() }, { status: 400 });
    }

    return NextResponse.json({ error: 'Unable to add invite.' }, { status: 500 });
  }
}
