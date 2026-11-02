"use client";

import { Component, Fragment, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { Hammer } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, LoadingCards } from "@/components/lendloop/shared";

type BoundaryState = {
  hasError: boolean;
  retryKey: number;
};

class PublicShelfBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { hasError: false, retryKey: 0 };

  static getDerivedStateFromError(): Partial<BoundaryState> {
    return { hasError: true };
  }

  retry = () => {
    this.setState(({ retryKey }) => ({ hasError: false, retryKey: retryKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <Alert>
          <AlertTitle>Public shelf is temporarily unavailable</AlertTitle>
          <AlertDescription>The rest of LendLoop is still available. Try again in a moment.</AlertDescription>
          <AlertAction>
            <Button type="button" size="sm" variant="outline" onClick={this.retry}>
              Retry
            </Button>
          </AlertAction>
        </Alert>
      );
    }

    return <Fragment key={this.state.retryKey}>{this.props.children}</Fragment>;
  }
}

function PublicShelfResults() {
  const tools = useQuery(api.tools.listPublic);

  if (tools === undefined) {
    return <LoadingCards label="available tools" />;
  }

  if (tools.length === 0) {
    return (
      <EmptyState
        title="The shelf is ready for its first tool"
        description="When someone lists an available tool, it will appear here."
        icon={Hammer}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool) => (
        <Card key={tool.key}>
          <CardHeader>
            <CardDescription>{tool.category}</CardDescription>
            <CardTitle className="text-lg">{tool.name}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export function PublicShelf() {
  return (
    <PublicShelfBoundary>
      <PublicShelfResults />
    </PublicShelfBoundary>
  );
}
