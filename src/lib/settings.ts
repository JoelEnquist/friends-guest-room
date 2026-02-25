import { Settings } from '@prisma/client';

import { decryptField, encryptField } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { appEnv } from '@/lib/env';

type SettingsInput = {
  wifiName?: string;
  wifiPassword?: string;
  arrivalInstructions?: string;
  guidebookText?: string;
  nearbyRecommendations?: string;
  polycamLink?: string;
  venmoHandle?: string;
  paymentInstructions?: string;
  checkoutChecklist?: string;
  propertyDoorCode?: string;
  guestRoomDoorCode?: string;
  photoUrls?: string[];
};

export async function getSettings(): Promise<Settings> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });

  if (settings) {
    return settings;
  }

  return prisma.settings.create({
    data: {
      id: 1,
      checkoutChecklist:
        'Take out trash to bins.\\nQuick wipe surfaces.\\nPut used towels/linens in laundry bag.\\nLock doors and confirm checkout time.',
      paymentInstructions:
        'If you choose the paid cleaning option, please send $20 (+ optional $10 tip) via Venmo or leave cash.',
      arrivalInstructions:
        'You will use two code-locked doors: property entrance, then courtyard to guest room door.',
      guidebookText: 'Welcome to The Grow Room, our friends-only guest room.',
      photosJson: JSON.stringify([]),
    },
  });
}

export async function updateSettings(input: SettingsInput): Promise<Settings> {
  const current = await getSettings();
  const rotatingCodes =
    (input.propertyDoorCode !== undefined && input.propertyDoorCode !== null) ||
    (input.guestRoomDoorCode !== undefined && input.guestRoomDoorCode !== null);

  return prisma.settings.update({
    where: { id: 1 },
    data: {
      wifiName: input.wifiName,
      wifiPassword: input.wifiPassword,
      arrivalInstructions: input.arrivalInstructions,
      guidebookText: input.guidebookText,
      nearbyRecommendations: input.nearbyRecommendations,
      polycamLink: input.polycamLink,
      venmoHandle: input.venmoHandle,
      paymentInstructions: input.paymentInstructions,
      checkoutChecklist: input.checkoutChecklist,
      photosJson:
        input.photoUrls !== undefined ? JSON.stringify(input.photoUrls) : undefined,
      lastDoorCodeRotationAt: rotatingCodes
        ? new Date()
        : current.lastDoorCodeRotationAt,
      propertyDoorCodeEnc:
        input.propertyDoorCode !== undefined
          ? input.propertyDoorCode
            ? encryptField(input.propertyDoorCode)
            : null
          : undefined,
      guestRoomDoorCodeEnc:
        input.guestRoomDoorCode !== undefined
          ? input.guestRoomDoorCode
            ? encryptField(input.guestRoomDoorCode)
            : null
          : undefined,
    },
  });
}

export function resolveDoorCodes(settings: Settings): {
  propertyDoorCode: string | null;
  guestRoomDoorCode: string | null;
} {
  const envFallback = {
    propertyDoorCode: appEnv.propertyDoorCodeEnv ?? null,
    guestRoomDoorCode: appEnv.guestRoomDoorCodeEnv ?? null,
  };

  return {
    propertyDoorCode: decryptField(settings.propertyDoorCodeEnc) ?? envFallback.propertyDoorCode,
    guestRoomDoorCode: decryptField(settings.guestRoomDoorCodeEnc) ?? envFallback.guestRoomDoorCode,
  };
}

export function resolvePhotoUrls(settings: Settings): string[] {
  if (!settings.photosJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(settings.photosJson) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}
