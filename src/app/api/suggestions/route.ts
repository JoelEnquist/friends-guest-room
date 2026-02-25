import { SuggestionCategory, SuggestionOwnerEffort } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireApiUser } from '@/lib/access';
import { SUSTAINABILITY_PLAN_OPTIONS } from '@/lib/suggestion-options';
import {
  createSuggestion,
  SuggestionValidationError,
} from '@/lib/suggestions';

const suggestionSchema = z.object({
  title: z.string().trim().min(3).max(80),
  category: z.nativeEnum(SuggestionCategory),
  idea: z.string().trim().min(12).max(4000),
  sustainabilityPlan: z
    .array(z.enum(SUSTAINABILITY_PLAN_OPTIONS))
    .min(1, 'Choose at least one sustainability plan option.'),
  ownerEffort: z.nativeEnum(SuggestionOwnerEffort),
  estimatedCost: z.string().trim().max(80).optional().or(z.literal('')),
  productUrl: z.string().trim().url().max(500).optional().or(z.literal('')),
  relatedBookingId: z.string().trim().max(64).optional().or(z.literal('')),
});

export async function POST(request: Request) {
  const { user, error } = await requireApiUser();
  if (!user) {
    return error;
  }

  try {
    const body = suggestionSchema.parse(await request.json());

    const suggestion = await createSuggestion({
      user,
      title: body.title,
      category: body.category,
      idea: body.idea,
      sustainabilityPlan: body.sustainabilityPlan,
      ownerEffort: body.ownerEffort,
      estimatedCost: body.estimatedCost || null,
      productUrl: body.productUrl || null,
      relatedBookingId: body.relatedBookingId || null,
    });

    return NextResponse.json({ suggestionId: suggestion.id }, { status: 201 });
  } catch (routeError) {
    if (routeError instanceof z.ZodError) {
      return NextResponse.json({ error: routeError.flatten() }, { status: 400 });
    }

    if (routeError instanceof SuggestionValidationError) {
      return NextResponse.json({ error: routeError.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Unable to submit suggestion.' }, { status: 500 });
  }
}
