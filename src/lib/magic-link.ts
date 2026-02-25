import crypto from 'crypto';

import { prisma } from '@/lib/db';
import { appEnv } from '@/lib/env';

function requireAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is required to generate invite magic links.');
  }

  return secret;
}

function hashToken(token: string, secret: string): string {
  return crypto.createHash('sha256').update(`${token}${secret}`).digest('hex');
}

export async function createEmailMagicLink(args: {
  email: string;
  callbackPath?: string;
  maxAgeSeconds?: number;
}): Promise<{ url: string; expires: Date }> {
  const email = args.email.trim().toLowerCase();
  const token = crypto.randomBytes(32).toString('hex');
  const secret = requireAuthSecret();
  const maxAgeSeconds = args.maxAgeSeconds ?? 15 * 60;
  const expires = new Date(Date.now() + maxAgeSeconds * 1000);

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: hashToken(token, secret),
      expires,
    },
  });

  const callbackUrl = `${appEnv.appUrl}${args.callbackPath ?? '/calendar'}`;
  const params = new URLSearchParams({
    callbackUrl,
    token,
    email,
  });

  return {
    url: `${appEnv.appUrl}/api/auth/callback/email?${params.toString()}`,
    expires,
  };
}
