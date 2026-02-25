import { PrismaClient } from '@prisma/client';

import { encryptField } from '../src/lib/crypto';

const prisma = new PrismaClient();

function collectAdminEmails(): string[] {
  const explicit = [process.env.ADMIN_EMAIL_1, process.env.ADMIN_EMAIL_2]
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value));

  const csv = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set([...explicit, ...csv])];
}

async function main() {
  const adminEmails = collectAdminEmails();

  for (const email of adminEmails) {
    await prisma.user.upsert({
      where: { email },
      update: {
        allowed: true,
        role: 'ADMIN',
      },
      create: {
        email,
        name: email,
        allowed: true,
        role: 'ADMIN',
      },
    });
  }

  const propertyDoorCode = process.env.PROPERTY_DOOR_CODE;
  const guestRoomDoorCode = process.env.GUEST_ROOM_DOOR_CODE;

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      wifiName: process.env.DEFAULT_WIFI_NAME ?? 'Guest Wi-Fi',
      wifiPassword: process.env.DEFAULT_WIFI_PASSWORD ?? '',
      venmoHandle: process.env.DEFAULT_VENMO_HANDLE ?? '@your-venmo',
      arrivalInstructions:
        'Use two code-locked doors: property entrance, then courtyard to guest room door.',
      paymentInstructions:
        'If you choose the cleaning contribution, 100% goes directly to our maid for turnover cleaning - we do not keep any of it.',
      checkoutChecklist:
        'Take out trash to bins location.\\nQuick wipe surfaces.\\nPut used towels/linens into laundry bag.\\nLock both doors and confirm checkout time.',
      guidebookText:
        'Welcome to The Grow Room. This room is free for friends and family. Please reset the space before checkout.',
      nearbyRecommendations: 'Coffee, grocery, and park recommendations go here.',
      photosJson: JSON.stringify([]),
      lastDoorCodeRotationAt:
        propertyDoorCode || guestRoomDoorCode ? new Date() : undefined,
      propertyDoorCodeEnc: propertyDoorCode ? encryptField(propertyDoorCode) : undefined,
      guestRoomDoorCodeEnc: guestRoomDoorCode ? encryptField(guestRoomDoorCode) : undefined,
    },
    create: {
      id: 1,
      wifiName: process.env.DEFAULT_WIFI_NAME ?? 'Guest Wi-Fi',
      wifiPassword: process.env.DEFAULT_WIFI_PASSWORD ?? '',
      venmoHandle: process.env.DEFAULT_VENMO_HANDLE ?? '@your-venmo',
      arrivalInstructions:
        'Use two code-locked doors: property entrance, then courtyard to guest room door.',
      paymentInstructions:
        'If you choose the cleaning contribution, 100% goes directly to our maid for turnover cleaning - we do not keep any of it.',
      checkoutChecklist:
        'Take out trash to bins location.\\nQuick wipe surfaces.\\nPut used towels/linens into laundry bag.\\nLock both doors and confirm checkout time.',
      guidebookText:
        'Welcome to The Grow Room. This room is free for friends and family. Please reset the space before checkout.',
      nearbyRecommendations: 'Coffee, grocery, and park recommendations go here.',
      photosJson: JSON.stringify([]),
      lastDoorCodeRotationAt:
        propertyDoorCode || guestRoomDoorCode ? new Date() : undefined,
      propertyDoorCodeEnc: propertyDoorCode ? encryptField(propertyDoorCode) : undefined,
      guestRoomDoorCodeEnc: guestRoomDoorCode ? encryptField(guestRoomDoorCode) : undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorEmail: adminEmails[0] ?? null,
      actionType: 'SEED_EXECUTED',
      payload: JSON.stringify({
        adminUsers: adminEmails.length,
      }),
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
