// American Creator brand colors (from Figma).
//
// Plain color constants with NO 'use client' directive, so BOTH server and
// client components can import them. theme.ts ('use client', MUI createTheme)
// re-exports `palette` for the many existing `@/lib/theme` importers, but
// server components (e.g. the legal pages, which must be server components to
// use generateStaticParams + getTranslations) import directly from here to
// avoid crossing the React Server Components client/server boundary.
export const palette = {
  primary: '#334a9f',
  primaryLight: '#d6dbec',
  bgLight: '#f6f9ff',
  white: '#ffffff',
  footerDark: '#212125',
  footerText: '#f6f9ff',
  footerSecondary: '#adb7d9',
  cartBadge: '#ff002d',
};
