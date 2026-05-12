import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PHIDTECH MS – Management System",
  description: "Unified Business Operations Management System by Phid Technologies",
  verification: {
    google: "eHvM752gDIKQSJaNz4yW4xNQFFcSKLU3JEyXW-XGgC4",
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
