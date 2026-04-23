import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PHIDTECH MS – Management System",
  description: "Unified Business Operations Management System by Phid Technologies",
  verification: {
    google: "-X1kmL0billTN7GLypZVnk33a9FUuq-p92AUUpt2ypA",
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
