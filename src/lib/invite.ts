export function normalizeEmail(email?: string | null): string | null {
  return email?.trim().toLowerCase() ?? null;
}

type InviteCheckDependencies = {
  adminEmails: string[];
  getUserAllowedByEmail: (email: string) => Promise<boolean>;
  ensureAdminUser: (email: string) => Promise<void>;
};

export async function isInviteAllowed(
  email: string,
  dependencies: InviteCheckDependencies,
): Promise<boolean> {
  if (dependencies.adminEmails.includes(email)) {
    await dependencies.ensureAdminUser(email);
    return true;
  }

  return dependencies.getUserAllowedByEmail(email);
}
