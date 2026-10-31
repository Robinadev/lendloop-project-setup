"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { ArrowLeft, Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminView, BrowseView, IncomingView, ListingsView, RequestsView } from "@/components/lendloop/dashboard-views";
import { DashboardError, LoadingCards, type ActionRunner } from "@/components/lendloop/shared";

function errorText(error: unknown) {
  if (error && typeof error === "object" && "data" in error && typeof error.data === "string") return error.data;
  if (error instanceof Error) return error.message;
  return "Please try again.";
}

type DashboardTab = "browse" | "listings" | "requests" | "incoming" | "admin";

export function DashboardClient() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const profile = useQuery(api.users.me);
  const storeProfile = useMutation(api.users.store);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [tab, setTab] = useState<DashboardTab>("browse");

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      void storeProfile().catch((error: unknown) => setProfileError(errorText(error)));
    }
  }, [isAuthenticated, isLoading, storeProfile]);

  const run = useCallback<ActionRunner>(async (action, successMessage) => {
    setActionError(null);
    try {
      await action();
      if (successMessage) toast.success(successMessage);
      return true;
    } catch (error) {
      const message = errorText(error);
      setActionError(message);
      toast.error(message);
      return false;
    }
  }, []);

  const retryProfile = async () => {
    setProfileError(null);
    try {
      await storeProfile();
      toast.success("Your account is ready");
    } catch (error) {
      setProfileError(errorText(error));
    }
  };

  if (isLoading || (isAuthenticated && profile === undefined)) {
    return <main className="site-wrap dashboard-shell"><LoadingCards label="your workspace" /></main>;
  }

  if (!isAuthenticated) {
    return (
      <main className="site-wrap dashboard-shell">
        <Card className="mx-auto max-w-xl">
          <CardHeader><CardTitle>Sign in to open your board</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">Your lending workspace is available to signed-in neighbors.</p>
            <Button render={<Link href="/sign-in" />}>Sign in</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="site-wrap dashboard-shell">
        <Card className="mx-auto max-w-xl">
          <CardHeader><CardTitle>Preparing your account</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            {profileError ? <DashboardError message={profileError} /> : <p className="text-sm text-muted-foreground">Your profile is being set up securely.</p>}
            {profileError ? <Button onClick={() => void retryProfile()}>Try again</Button> : null}
          </CardContent>
        </Card>
      </main>
    );
  }

  const isAdmin = profile.role === "admin";

  return (
    <main className="site-wrap dashboard-shell">
      <header className="app-topbar">
        <Link className="brand" href="/" aria-label="LendLoop home">
          <span className="brand-mark"><Repeat2 aria-hidden="true" /></span>
          <span>LendLoop</span>
        </Link>
        <div className="flex items-center gap-2">
          {profile.trustedLender ? <Badge variant="outline">Trusted lender</Badge> : null}
          <Badge variant={isAdmin ? "default" : "secondary"}>{isAdmin ? "Admin" : "Neighbor"}</Badge>
          <UserButton />
        </div>
      </header>

      <section className="dashboard-intro">
        <Button render={<Link href="/" />} size="sm" variant="ghost">
          <ArrowLeft data-icon="inline-start" />
          Public board
        </Button>
        <p className="eyebrow">Your neighborhood</p>
        <h1 className="dashboard-title">A little more shared.</h1>
        <p className="max-w-2xl text-muted-foreground">Browse what&apos;s available, keep your listings current, and make borrowing straightforward for everyone.</p>
      </section>

      {actionError ? <div className="mb-5"><DashboardError message={actionError} /></div> : null}

      <Tabs value={tab} onValueChange={(value) => setTab(value as DashboardTab)} className="flex flex-col gap-5">
        <div className="max-w-full overflow-x-auto pb-1">
          <TabsList aria-label="Workspace sections" className="w-max min-w-full justify-start sm:min-w-0">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="listings">My listings</TabsTrigger>
            <TabsTrigger value="requests">My requests</TabsTrigger>
            <TabsTrigger value="incoming">Incoming</TabsTrigger>
            {isAdmin ? <TabsTrigger value="admin">Admin</TabsTrigger> : null}
          </TabsList>
        </div>
        <TabsContent value="browse">{tab === "browse" ? <BrowseView isAdmin={isAdmin} run={run} /> : null}</TabsContent>
        <TabsContent value="listings">{tab === "listings" ? <ListingsView run={run} /> : null}</TabsContent>
        <TabsContent value="requests">{tab === "requests" ? <RequestsView run={run} /> : null}</TabsContent>
        <TabsContent value="incoming">{tab === "incoming" ? <IncomingView run={run} /> : null}</TabsContent>
        {isAdmin ? <TabsContent value="admin">{tab === "admin" ? <AdminView run={run} /> : null}</TabsContent> : null}
      </Tabs>
    </main>
  );
}
