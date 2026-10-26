// Minimal root layout required by Next.js to build.
// Frontend owns this file — replace freely.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mr">
      <body>{children}</body>
    </html>
  );
}
