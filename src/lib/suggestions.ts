import {
  Suggestion,
  SuggestionCategory,
  SuggestionOwnerEffort,
  SuggestionStatus,
  User,
} from '@prisma/client';

import { writeAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/db';
import {
  SUSTAINABILITY_PLAN_OPTIONS,
  type SustainabilityPlanValue,
} from '@/lib/suggestion-options';

export class SuggestionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SuggestionValidationError';
  }
}

export function serializeSustainabilityPlan(values: SustainabilityPlanValue[]): string {
  const deduped = Array.from(new Set(values));
  return JSON.stringify(deduped);
}

export function parseSustainabilityPlan(raw: string | null | undefined): SustainabilityPlanValue[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((value): value is SustainabilityPlanValue =>
      SUSTAINABILITY_PLAN_OPTIONS.includes(value as SustainabilityPlanValue),
    );
  } catch {
    return [];
  }
}

export function deriveActionableBy(plan: SustainabilityPlanValue[]): 'GUEST' | 'OWNER' {
  const guestActionable = plan.some(
    (value) =>
      value === 'I can do this myself this stay' ||
      value === 'I can do this next time' ||
      value === 'Another guest could do this easily',
  );

  return guestActionable ? 'GUEST' : 'OWNER';
}

export async function userHasCompletedStay(userId: string, now: Date = new Date()): Promise<boolean> {
  const booking = await prisma.booking.findFirst({
    where: {
      guestUserId: userId,
      status: 'APPROVED',
      endDate: { lt: now },
    },
    select: { id: true },
  });

  return Boolean(booking);
}

export async function listCompletedStaysForUser(userId: string, now: Date = new Date()) {
  return prisma.booking.findMany({
    where: {
      guestUserId: userId,
      status: 'APPROVED',
      endDate: { lt: now },
    },
    orderBy: [{ endDate: 'desc' }],
    select: {
      id: true,
      guestName: true,
      startDate: true,
      endDate: true,
    },
  });
}

export async function listSuggestionsForUser(userId: string) {
  return prisma.suggestion.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }],
    include: {
      relatedBooking: {
        select: {
          id: true,
          startDate: true,
          endDate: true,
        },
      },
    },
  });
}

export async function createSuggestion(args: {
  user: User;
  title: string;
  idea: string;
  category: SuggestionCategory;
  sustainabilityPlan: SustainabilityPlanValue[];
  ownerEffort: SuggestionOwnerEffort;
  estimatedCost?: string | null;
  productUrl?: string | null;
  relatedBookingId?: string | null;
}): Promise<Suggestion> {
  const hasCompletedStay = await userHasCompletedStay(args.user.id);
  if (!hasCompletedStay) {
    throw new SuggestionValidationError('Suggestions are available after your first stay.');
  }

  if (args.sustainabilityPlan.length < 1) {
    throw new SuggestionValidationError('Choose at least one sustainability plan option.');
  }

  if (
    args.ownerEffort === 'GT_60_MIN' &&
    !args.sustainabilityPlan.includes('I can do this myself this stay')
  ) {
    throw new SuggestionValidationError(
      'Suggestions over 60 minutes need a self-implementation plan to stay sustainable.',
    );
  }

  if (args.relatedBookingId) {
    const relatedBooking = await prisma.booking.findFirst({
      where: {
        id: args.relatedBookingId,
        guestUserId: args.user.id,
        status: 'APPROVED',
        endDate: { lt: new Date() },
      },
      select: { id: true },
    });

    if (!relatedBooking) {
      throw new SuggestionValidationError('Selected stay is not eligible for this suggestion.');
    }
  }

  const suggestion = await prisma.suggestion.create({
    data: {
      userId: args.user.id,
      relatedBookingId: args.relatedBookingId ?? null,
      title: args.title.trim(),
      idea: args.idea.trim(),
      category: args.category,
      sustainabilityPlan: serializeSustainabilityPlan(args.sustainabilityPlan),
      ownerEffort: args.ownerEffort,
      estimatedCost: args.estimatedCost?.trim() || null,
      productUrl: args.productUrl?.trim() || null,
      status: 'NEW',
    },
  });

  await writeAuditLog({
    actorEmail: args.user.email,
    actionType: 'SUGGESTION_CREATED',
    payload: {
      suggestionId: suggestion.id,
      category: suggestion.category,
      ownerEffort: suggestion.ownerEffort,
    },
  });

  return suggestion;
}

export async function listAdminSuggestions(filters: {
  status?: SuggestionStatus | null;
  category?: SuggestionCategory | null;
}) {
  return prisma.suggestion.findMany({
    where: {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.category ? { category: filters.category } : {}),
    },
    orderBy: [{ createdAt: 'desc' }],
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      relatedBooking: {
        select: { id: true, startDate: true, endDate: true },
      },
    },
  });
}

export async function getAdminSuggestionById(id: string) {
  return prisma.suggestion.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      relatedBooking: {
        select: { id: true, startDate: true, endDate: true },
      },
    },
  });
}

export async function updateSuggestionAdmin(args: {
  suggestionId: string;
  actor: User;
  status?: SuggestionStatus;
  category?: SuggestionCategory;
  ownerEffort?: SuggestionOwnerEffort;
  adminNotes?: string | null;
}): Promise<Suggestion> {
  const existing = await prisma.suggestion.findUnique({ where: { id: args.suggestionId } });
  if (!existing) {
    throw new SuggestionValidationError('Suggestion not found.');
  }

  const updated = await prisma.suggestion.update({
    where: { id: existing.id },
    data: {
      ...(args.status ? { status: args.status } : {}),
      ...(args.category ? { category: args.category } : {}),
      ...(args.ownerEffort ? { ownerEffort: args.ownerEffort } : {}),
      ...(args.adminNotes !== undefined ? { adminNotes: args.adminNotes?.trim() || null } : {}),
    },
  });

  await writeAuditLog({
    actorEmail: args.actor.email,
    actionType: 'SUGGESTION_ADMIN_UPDATED',
    payload: {
      suggestionId: updated.id,
      previousStatus: existing.status,
      nextStatus: updated.status,
      category: updated.category,
      ownerEffort: updated.ownerEffort,
    },
  });

  return updated;
}
