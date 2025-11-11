import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plannera.ai AB",
  description:
    "Next.js 14 starter for the Plannera.ai property development platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans">
        {children}
      </body>
    </html>
  );
}
