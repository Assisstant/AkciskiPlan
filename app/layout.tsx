import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Akciski Plan",
  description: "Мултикорисничка апликација за акциски план и евиденција на ученички напредок."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mk">
      <body>{children}</body>
    </html>
  );
}
