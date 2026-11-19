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

function getConvexUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (configuredUrl) return configuredUrl;

  const deploymentName = process.env.CONVEX_DEPLOY_KEY?.match(
    /^(?:dev|prod):([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)\|/i,
  )?.[1];

  return deploymentName ? `https://${deploymentName}.convex.cloud` : undefined;
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const convexUrl = getConvexUrl();
  const requiredEnvironmentVariables = [
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
  ];
  const missingEnvironmentVariables = requiredEnvironmentVariables.filter((name) => !process.env[name]);

  if (!convexUrl) missingEnvironmentVariables.push("NEXT_PUBLIC_CONVEX_URL");

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <AppProviders convexUrl={convexUrl} missingEnvironmentVariables={missingEnvironmentVariables}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
