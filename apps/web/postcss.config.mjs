// RFC-2026-029 §3.2: `@tailwindcss/postcss` and `postcss` are imported here and nowhere else.
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
