import type { Metadata } from "next";
import { PasscodeGate } from "@/components/auth/PasscodeGate";
import "./globals.css";

export const metadata: Metadata = {
  title: "Duro Tracks - Sales Analysis Dashboard",
  description: "Sales analysis dashboard with Account Discovery, Value Map, and MEDDPICC frameworks",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <PasscodeGate>{children}</PasscodeGate>
      </body>
    </html>
  );
}
