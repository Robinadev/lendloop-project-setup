import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/components/lendloop/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "LendLoop — Good tools, closer to home",
  description: "Borrow what you need and lend what you don't with LendLoop, a neighborhood tool-sharing board.",
  applicationName: "LendLoop",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f1e8" },
    { media: "(prefers-color-scheme: dark)", color: "#17211b" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
