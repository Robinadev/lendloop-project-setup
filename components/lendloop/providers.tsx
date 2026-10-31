"use client";

import type { ReactNode } from "react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { ThemeProvider } from "next-themes";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { Toaster } from "@/components/ui/sonner";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL. Connect the Convex integration to this project.");
}

const convex = new ConvexReactClient(convexUrl);

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider appearance={{ theme: shadcn }}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          {children}
          <Toaster position="top-right" />
        </ConvexProviderWithClerk>
      </ThemeProvider>
    </ClerkProvider>
  );
}
