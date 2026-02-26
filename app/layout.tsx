import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BOMS – Business Operations Management System",
  description: "Unified Business Operations Management System by Phid Technologies",
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
