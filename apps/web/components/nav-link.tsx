'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const path = usePathname();
  const active = href === '/' ? path === '/' : path.startsWith(href);
  return (
    <a
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex shrink-0 items-center gap-2.5 rounded-control px-3 py-2 text-body font-semibold ${
        active ? 'bg-forest-50 text-forest-700' : 'text-muted hover:bg-surface-2 hover:text-ink'
      }`}
    >
      {children}
    </a>
  );
}
