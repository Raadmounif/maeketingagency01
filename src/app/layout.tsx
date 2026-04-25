import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Locale-specific layout is handled in `app/[locale]/layout.tsx`
  return children;
}
