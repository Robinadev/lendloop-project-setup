"use client";

import { useMemo, type ReactNode } from "react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ui } from "@clerk/ui";
import { shadcn } from "@clerk/ui/themes";
import { ThemeProvider } from "next-themes";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Toaster } from "@/components/ui/sonner";

function IntegrationSetupNotice({ missingVariables }: { missingVariables: string[] }) {
  return (
    <main className="site-wrap flex min-h-screen items-center py-12">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div>
          <p className="eyebrow">LendLoop setup</p>
          <h1 className="dashboard-title">Connect the last piece.</h1>
          <p className="mt-3 text-muted-foreground">
            LendLoop needs its Clerk sign-in and Convex board settings before the app can load.
          </p>
        </div>
        <Alert>
          <AlertTitle>Required integration settings are missing</AlertTitle>
          <AlertDescription>
            <p>Missing environment variables: <code>{missingVariables.join(", ")}</code>.</p>
            <p>Check the Clerk and Convex integrations in this project&apos;s settings, then refresh the preview after the values are available.</p>
          </AlertDescription>
        </Alert>
      </div>
    </main>
  );
}

export function AppProviders({
  children,
  convexUrl,
  missingEnvironmentVariables,
}: {
  children: ReactNode;
  convexUrl?: string;
  missingEnvironmentVariables: string[];
}) {
  const convex = useMemo(() => (convexUrl ? new ConvexReactClient(convexUrl) : null), [convexUrl]);
  const missingVariables = [
    ...new Set([
      ...missingEnvironmentVariables,
      ...(!convex ? ["NEXT_PUBLIC_CONVEX_URL"] : []),
    ]),
  ];

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {missingVariables.length > 0 || !convex ? (
        <IntegrationSetupNotice missingVariables={missingVariables} />
      ) : (
        <ClerkProvider appearance={{ theme: shadcn }} ui={ui}>
          <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            {children}
            <Toaster position="top-right" />
          </ConvexProviderWithClerk>
        </ClerkProvider>
      )}
    </ThemeProvider>
  );
}
