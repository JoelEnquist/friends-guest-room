import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';

import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function getCurrentUser() {
  const session = await getServerAuthSession();
  const email = session?.user?.email?.toLowerCase();

  if (!email) {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user?.allowed) {
    return null;
  }

  return user;
}

export async function requirePageUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return user;
}

export async function requirePageAdmin() {
  const user = await requirePageUser();

  if (user.role !== 'ADMIN') {
    redirect('/calendar');
  }

  return user;
}

export async function requireApiUser() {
  const user = await getCurrentUser();

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
  }

  return { user, error: null };
}

export async function requireApiAdmin() {
  const result = await requireApiUser();

  if (!result.user) {
    return result;
  }

  if (result.user.role !== 'ADMIN') {
    return {
      user: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { user: result.user, error: null };
}
