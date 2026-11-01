import { auth } from "@clerk/nextjs/server";
import { DashboardClient } from "@/components/lendloop/dashboard-client";

export default async function DashboardPage() {
  await auth.protect();
  return <DashboardClient />;
}
