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
  const requiredEnvironmentVariables = [
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "NEXT_PUBLIC_CONVEX_URL",
  ];
  const missingEnvironmentVariables = requiredEnvironmentVariables.filter((name) => !process.env[name]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <AppProviders missingEnvironmentVariables={missingEnvironmentVariables}>{children}</AppProviders>
      </body>
    </html>
  );
}
