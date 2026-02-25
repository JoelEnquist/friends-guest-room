import { prisma } from '@/lib/db';

export async function writeAuditLog(args: {
  actorEmail?: string | null;
  actionType: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorEmail: args.actorEmail?.toLowerCase() ?? null,
      actionType: args.actionType,
      payload: args.payload ? JSON.stringify(args.payload) : null,
    },
  });
}
