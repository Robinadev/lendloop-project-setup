"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { ArrowRight, Hammer, PackageOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardWelcome({
  name,
  onBrowse,
  onList,
}: {
  name: string;
  onBrowse: () => void;
  onList: () => void;
}) {
  const shelf = useQuery(api.tools.listPublic);
  const firstName = name.trim().split(/\s+/)[0] || "neighbor";

  return (
    <section
      aria-label="Welcome and public shelf"
      className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]"
    >
      <Card className="flex h-full flex-col justify-between">
        <CardHeader>
          <Badge className="w-fit" variant="outline">Your neighborhood</Badge>
          <CardTitle className="font-serif text-2xl font-normal text-balance">
            Welcome, {firstName}.
          </CardTitle>
          <CardDescription className="max-w-xl leading-relaxed">
            Your account is ready. Browse tools neighbors have shared, or add one of your own to make the shelf more useful.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-wrap gap-2">
          <Button onClick={onBrowse} type="button">
            <PackageOpen data-icon="inline-start" />
            Browse tools
          </Button>
          <Button onClick={onList} type="button" variant="outline">
            <Hammer data-icon="inline-start" />
            Share a tool
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardDescription>The public shelf</CardDescription>
              <CardTitle className="mt-1 text-xl">Available nearby</CardTitle>
            </div>
            {shelf !== undefined ? (
              <Badge variant="secondary">{shelf.length} {shelf.length === 1 ? "tool" : "tools"}</Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {shelf === undefined ? (
            <div aria-label="Loading public shelf" className="flex flex-col gap-3" role="status">
              <span className="sr-only">Loading public listings</span>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
            </div>
          ) : shelf.length > 0 ? (
            <ul aria-label="Available tools" className="flex flex-col gap-2">
              {shelf.slice(0, 3).map((tool) => (
                <li
                  className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3"
                  key={tool.key}
                >
                  <span className="font-medium">{tool.name}</span>
                  <Badge variant="outline">{tool.category}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/30 p-4">
              <p className="font-medium">The shelf is ready for its first listing.</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Share a tool you own so a neighbor can borrow it instead of buying another.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-0">
          <Button onClick={onBrowse} type="button" variant="ghost">
            View all tools
            <ArrowRight data-icon="inline-end" />
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}
