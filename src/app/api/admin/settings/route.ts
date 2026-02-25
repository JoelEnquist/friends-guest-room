import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireApiAdmin } from '@/lib/access';
import { writeAuditLog } from '@/lib/audit';
import { getSettings, resolveDoorCodes, resolvePhotoUrls, updateSettings } from '@/lib/settings';

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();

const settingsSchema = z.object({
  wifiName: nullableText(120),
  wifiPassword: nullableText(120),
  arrivalInstructions: nullableText(1000),
  guidebookText: nullableText(4000),
  nearbyRecommendations: nullableText(2000),
  polycamLink: z.string().url().nullable().optional().or(z.literal('')),
  venmoHandle: nullableText(120),
  paymentInstructions: nullableText(1000),
  checkoutChecklist: nullableText(2000),
  propertyDoorCode: nullableText(40),
  guestRoomDoorCode: nullableText(40),
  photoUrls: z.array(z.string().url()).optional(),
});

export async function GET() {
  const { user, error } = await requireApiAdmin();

  if (error || !user) {
    return error;
  }

  const settings = await getSettings();
  const doorCodes = resolveDoorCodes(settings);

  return NextResponse.json({
    settings: {
      id: settings.id,
      wifiName: settings.wifiName,
      wifiPassword: settings.wifiPassword,
      arrivalInstructions: settings.arrivalInstructions,
      guidebookText: settings.guidebookText,
      nearbyRecommendations: settings.nearbyRecommendations,
      polycamLink: settings.polycamLink,
      venmoHandle: settings.venmoHandle,
      paymentInstructions: settings.paymentInstructions,
      checkoutChecklist: settings.checkoutChecklist,
      photoUrls: resolvePhotoUrls(settings),
      lastDoorCodeRotationAt: settings.lastDoorCodeRotationAt,
      propertyDoorCode: doorCodes.propertyDoorCode,
      guestRoomDoorCode: doorCodes.guestRoomDoorCode,
    },
  });
}

export async function PUT(request: Request) {
  const { user, error } = await requireApiAdmin();

  if (error || !user) {
    return error;
  }

  try {
    const parsed = settingsSchema.parse(await request.json());
    const previous = await getSettings();
    const previousDoorCodes = resolveDoorCodes(previous);
    const normalizedPropertyDoorCode =
      parsed.propertyDoorCode === null ? '' : parsed.propertyDoorCode;
    const normalizedGuestRoomDoorCode =
      parsed.guestRoomDoorCode === null ? '' : parsed.guestRoomDoorCode;
    const propertyDoorCodeChanged =
      normalizedPropertyDoorCode !== undefined &&
      normalizedPropertyDoorCode !== previousDoorCodes.propertyDoorCode;
    const guestRoomDoorCodeChanged =
      normalizedGuestRoomDoorCode !== undefined &&
      normalizedGuestRoomDoorCode !== previousDoorCodes.guestRoomDoorCode;

    const settings = await updateSettings({
      wifiName: parsed.wifiName ?? undefined,
      wifiPassword: parsed.wifiPassword ?? undefined,
      arrivalInstructions: parsed.arrivalInstructions ?? undefined,
      guidebookText: parsed.guidebookText ?? undefined,
      nearbyRecommendations: parsed.nearbyRecommendations ?? undefined,
      polycamLink: parsed.polycamLink || undefined,
      venmoHandle: parsed.venmoHandle ?? undefined,
      paymentInstructions: parsed.paymentInstructions ?? undefined,
      checkoutChecklist: parsed.checkoutChecklist ?? undefined,
      propertyDoorCode: propertyDoorCodeChanged ? normalizedPropertyDoorCode : undefined,
      guestRoomDoorCode: guestRoomDoorCodeChanged ? normalizedGuestRoomDoorCode : undefined,
      photoUrls: parsed.photoUrls,
    });

    if (
      propertyDoorCodeChanged ||
      guestRoomDoorCodeChanged
    ) {
      await writeAuditLog({
        actorEmail: user.email,
        actionType: 'DOOR_CODES_UPDATED',
        payload: {
          hadPreviousPropertyCode: Boolean(previous.propertyDoorCodeEnc),
          hadPreviousGuestRoomCode: Boolean(previous.guestRoomDoorCodeEnc),
        },
      });
    }

    await writeAuditLog({
      actorEmail: user.email,
      actionType: 'SETTINGS_UPDATED',
    });

    return NextResponse.json({ settings });
  } catch (errorValue) {
    if (errorValue instanceof z.ZodError) {
      return NextResponse.json({ error: errorValue.flatten() }, { status: 400 });
    }

    return NextResponse.json({ error: 'Unable to update settings.' }, { status: 500 });
  }
}
