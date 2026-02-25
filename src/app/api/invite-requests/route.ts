import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createInviteRequest } from '@/lib/invite-requests';

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  socialProfileUrl: z.string().trim().url().max(500),
  mutualContact: z.string().trim().min(2).max(200),
  tripPurpose: z.string().trim().min(5).max(500),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  company: z.string().trim().max(200).optional().default(''),
});

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const globalForInviteRateLimit = globalThis as unknown as {
  inviteRequestRateLimitStore?: Map<string, RateLimitEntry>;
};

const inviteRateLimitStore =
  globalForInviteRateLimit.inviteRequestRateLimitStore ?? new Map<string, RateLimitEntry>();
globalForInviteRateLimit.inviteRequestRateLimitStore = inviteRateLimitStore;

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function enforceInviteRequestLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = inviteRateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    inviteRateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  inviteRateLimitStore.set(key, existing);
  return { ok: true };
}

function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const normalizedEmail = body.email.trim().toLowerCase();
    const ip = getClientIp(request);

    if (body.company) {
      // Honeypot: behave like success to reduce signal for simple bots.
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    const ipCheck = enforceInviteRequestLimit(`invite:ip:${ip}`, 6, 60 * 60 * 1000);
    if (!ipCheck.ok) {
      return NextResponse.json(
        { error: 'Too many invite requests from this connection. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(ipCheck.retryAfterSeconds) },
        },
      );
    }

    const emailCheck = enforceInviteRequestLimit(
      `invite:email:${normalizedEmail}`,
      3,
      24 * 60 * 60 * 1000,
    );
    if (!emailCheck.ok) {
      return NextResponse.json(
        { error: 'This email has reached the request limit for today. Please try again tomorrow.' },
        {
          status: 429,
          headers: { 'Retry-After': String(emailCheck.retryAfterSeconds) },
        },
      );
    }

    const requestedStartDate = parseLocalDate(body.startDate);
    const requestedEndDate = parseLocalDate(body.endDate);

    if (requestedEndDate <= requestedStartDate) {
      return NextResponse.json({ error: 'Checkout must be after check-in.' }, { status: 400 });
    }

    const inviteRequest = await createInviteRequest({
      fullName: body.fullName,
      email: normalizedEmail,
      socialProfileUrl: body.socialProfileUrl,
      mutualContact: body.mutualContact,
      tripPurpose: body.tripPurpose,
      requestedStartDate,
      requestedEndDate,
    });

    return NextResponse.json({ inviteRequestId: inviteRequest.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }

    return NextResponse.json({ error: 'Unable to submit invite request.' }, { status: 500 });
  }
}
