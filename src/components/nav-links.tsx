'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const items = [
    { href: '/calendar', label: 'Calendar' },
    { href: '/bookings', label: 'My requests' },
    { href: '/suggestions', label: 'Suggestions' },
    { href: '/guidebook', label: 'Guidebook' },
    ...(isAdmin
      ? [
          { href: '/admin', label: 'Admin' },
          { href: '/admin/suggestions', label: 'Triage' },
          { href: '/admin/qr', label: 'QR' },
        ]
      : []),
  ];

  return (
    <nav className="flex flex-wrap gap-2">
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== '/' && item.href !== '/admin' && pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-3 py-1.5 text-sm ${
              active
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--accent-soft)] text-[var(--accent)]'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
