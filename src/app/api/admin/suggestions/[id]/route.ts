import { SuggestionCategory, SuggestionOwnerEffort, SuggestionStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireApiAdmin } from '@/lib/access';
import { SuggestionValidationError, updateSuggestionAdmin } from '@/lib/suggestions';

const patchSchema = z
  .object({
    status: z.nativeEnum(SuggestionStatus).optional(),
    category: z.nativeEnum(SuggestionCategory).optional(),
    ownerEffort: z.nativeEnum(SuggestionOwnerEffort).optional(),
    adminNotes: z.string().max(4000).optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: 'No changes submitted.',
  });

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { user, error } = await requireApiAdmin();
  if (!user) {
    return error;
  }

  try {
    const body = patchSchema.parse(await request.json());
    const suggestion = await updateSuggestionAdmin({
      suggestionId: params.id,
      actor: user,
      status: body.status,
      category: body.category,
      ownerEffort: body.ownerEffort,
      adminNotes: body.adminNotes,
    });

    return NextResponse.json({ suggestion });
  } catch (routeError) {
    if (routeError instanceof z.ZodError) {
      return NextResponse.json({ error: routeError.flatten() }, { status: 400 });
    }

    if (routeError instanceof SuggestionValidationError) {
      return NextResponse.json({ error: routeError.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Unable to update suggestion.' }, { status: 500 });
  }
}
