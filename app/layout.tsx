import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paperlens | Question Paper Quality Auditor",
  description: "Review question papers for marks, duplicates, numbering, syllabus coverage and Bloom's taxonomy.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
