import type { NextConfig } from 'next';

// RFC-2026-029 §4.7: telemetry is off in CI and in every deployment. Next.js reads
// NEXT_TELEMETRY_DISABLED from the environment, so the build script and CI set it; this line is
// the same switch for any other way the config is loaded (a bare `npx next build`).
process.env.NEXT_TELEMETRY_DISABLED ??= '1';

const nextConfig: NextConfig = {
  // The skeleton serves no image. Unoptimized images keep `next build` from needing `sharp`,
  // an optional dependency of `next` whose libvips builds are LGPL-3.0-or-later (RFC-2026-029
  // Amendment 2026-10-12) and whose native binaries arrive only as optional packages.
  images: { unoptimized: true },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
