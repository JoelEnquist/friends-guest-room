import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import EmailProvider from 'next-auth/providers/email';

import { prisma } from '@/lib/db';
import { appEnv } from '@/lib/env';
import { sendEmail } from '@/lib/email';
import { isInviteAllowed, normalizeEmail } from '@/lib/invite';

async function isInvitedEmail(email: string): Promise<boolean> {
  return isInviteAllowed(email, {
    adminEmails: appEnv.adminEmails,
    getUserAllowedByEmail: async (candidate) => {
      const user = await prisma.user.findUnique({
        where: { email: candidate },
        select: { allowed: true },
      });
      return Boolean(user?.allowed);
    },
    ensureAdminUser: async (candidate) => {
      await prisma.user.upsert({
        where: { email: candidate },
        update: {
          allowed: true,
          role: 'ADMIN',
        },
        create: {
          email: candidate,
          allowed: true,
          role: 'ADMIN',
          name: candidate,
        },
      });
    },
  });
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'database',
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    EmailProvider({
      from: appEnv.emailFrom ?? 'noreply@example.com',
      maxAge: 15 * 60,
      async sendVerificationRequest(params) {
        await sendEmail({
          to: params.identifier,
          subject: 'Sign in to The Grow Room',
          text: `Use this link to sign in:\n${params.url}\n\nThis link expires in 15 minutes.`,
        });
      },
    }),
    ...(appEnv.googleClientId && appEnv.googleClientSecret
      ? [
          GoogleProvider({
            clientId: appEnv.googleClientId,
            clientSecret: appEnv.googleClientSecret,
            allowDangerousEmailAccountLinking: false,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user }) {
      const emailValue = normalizeEmail(user.email);

      if (!emailValue) {
        return false;
      }

      return isInvitedEmail(emailValue);
    },
    async session({ session }) {
      if (!session.user) {
        return session;
      }

      const email = normalizeEmail(session.user?.email);

      if (!email) {
        return session;
      }

      const dbUser = await prisma.user.findUnique({
        where: { email },
        select: { role: true, allowed: true, name: true },
      });

      if (!dbUser?.allowed) {
        session.user.role = 'GUEST';
        session.user.allowed = false;
        return session;
      }

      session.user.role = dbUser.role;
      session.user.allowed = dbUser.allowed;
      session.user.name = dbUser.name ?? session.user.name;
      return session;
    },
  },
};

export function getServerAuthSession() {
  return getServerSession(authOptions);
}
