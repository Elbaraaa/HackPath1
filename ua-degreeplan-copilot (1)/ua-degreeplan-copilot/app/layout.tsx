import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/app/components/toaster";

export const metadata: Metadata = {
  title: "UA DegreePlan Copilot",
  description: "AI-powered second major advisor for University of Arizona students",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
