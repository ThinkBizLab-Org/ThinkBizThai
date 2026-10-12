import type { ReactNode } from 'react';

import './globals.css';

// The skeleton's root layout (RFC-2026-029 §6.1, WP-1A-A0-002). No web font is loaded (nothing is
// fetched at build), no provider is wired and no data is read. A5 owns this file's content from the
// next package on (MOD-900).
export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="th">
      <body className="min-h-dvh bg-white text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
