import { getSettings, resolveDoorCodes } from '@/lib/settings';

export type LockCredentials = {
  propertyDoorCode: string | null;
  guestRoomDoorCode: string | null;
};

export interface LockProvider {
  getCredentialsForApprovedBooking(): Promise<LockCredentials>;
}

class StaticLockProvider implements LockProvider {
  async getCredentialsForApprovedBooking(): Promise<LockCredentials> {
    const settings = await getSettings();
    return resolveDoorCodes(settings);
  }
}

export const lockProvider: LockProvider = new StaticLockProvider();
