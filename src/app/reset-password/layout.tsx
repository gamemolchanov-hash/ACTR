/**
 * Minimal root layout for the reset-password shim route.
 *
 * This page lives OUTSIDE [locale] (ARM email links point here without locale prefix).
 * It just needs a valid HTML root; the actual redirect logic is in page.tsx.
 */
export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
