import { NextResponse } from 'next/server';

import { requireApiAdmin } from '@/lib/access';
import { listInviteRequests } from '@/lib/invite-requests';

export async function GET() {
  const { user, error } = await requireApiAdmin();

  if (error || !user) {
    return error;
  }

  const inviteRequests = await listInviteRequests();
  return NextResponse.json({ inviteRequests });
}
