import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireApiAdmin } from '@/lib/access';
import { reviewInviteRequest } from '@/lib/invite-requests';

const schema = z.object({
  action: z.enum(['approve', 'deny']),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ inviteRequestId: string }> },
) {
  const { user, error } = await requireApiAdmin();

  if (error || !user) {
    return error;
  }

  try {
    const body = schema.parse(await request.json());
    const { inviteRequestId } = await params;
    const inviteRequest = await reviewInviteRequest({
      inviteRequestId,
      reviewer: user,
      status: body.action === 'approve' ? 'APPROVED' : 'DENIED',
    });

    return NextResponse.json({ inviteRequest });
  } catch (errorValue) {
    if (errorValue instanceof z.ZodError) {
      return NextResponse.json({ error: errorValue.flatten() }, { status: 400 });
    }

    return NextResponse.json({ error: errorValue instanceof Error ? errorValue.message : 'Unable to review invite request.' }, { status: 500 });
  }
}
