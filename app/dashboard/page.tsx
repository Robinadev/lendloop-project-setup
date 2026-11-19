import { auth } from "@clerk/nextjs/server";
import { DashboardClient } from "@/components/lendloop/dashboard-client";

export default async function DashboardPage() {
  const hasRequiredConfiguration = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY &&
      process.env.NEXT_PUBLIC_CONVEX_URL,
  );

  if (!hasRequiredConfiguration) return null;

  await auth.protect();
  return <DashboardClient />;
}
