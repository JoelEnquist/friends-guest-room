import { describe, expect, it, vi } from 'vitest';

import { isInviteAllowed } from '@/lib/invite';

describe('isInviteAllowed', () => {
  it('allows admin allowlist emails and provisions admin user', async () => {
    const ensureAdminUser = vi.fn(async () => {});

    const allowed = await isInviteAllowed('admin@example.com', {
      adminEmails: ['admin@example.com'],
      getUserAllowedByEmail: async () => false,
      ensureAdminUser,
    });

    expect(allowed).toBe(true);
    expect(ensureAdminUser).toHaveBeenCalledWith('admin@example.com');
  });

  it('denies non-invited guest emails', async () => {
    const allowed = await isInviteAllowed('stranger@example.com', {
      adminEmails: ['admin@example.com'],
      getUserAllowedByEmail: async () => false,
      ensureAdminUser: async () => {},
    });

    expect(allowed).toBe(false);
  });
});
