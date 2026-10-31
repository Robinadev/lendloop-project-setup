import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

export type ActionRunner = (
  action: () => Promise<unknown>,
  successMessage?: string,
) => Promise<boolean>;

export type LoanStatus = "pending" | "approved" | "declined" | "returned" | "cancelled";

export function DashboardError({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>That didn&apos;t work</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function StatusBadge({ status, overdue = false }: { status: LoanStatus; overdue?: boolean }) {
  const variants = {
    pending: "secondary",
    approved: "default",
    declined: "outline",
    returned: "outline",
    cancelled: "outline",
  } as const;

  const labels: Record<LoanStatus, string> = {
    pending: "Pending",
    approved: "Approved",
    declined: "Declined",
    returned: "Returned",
    cancelled: "Cancelled",
  };

  return <Badge variant={overdue ? "destructive" : variants[status]}>{overdue ? "Overdue" : labels[status]}</Badge>;
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <Empty className="min-h-48 border border-dashed border-border bg-card/50">
      <EmptyHeader>
        {Icon ? (
          <EmptyMedia variant="icon">
            <Icon aria-hidden="true" />
          </EmptyMedia>
        ) : null}
        <EmptyTitle role="heading" aria-level={3}>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}

export function LoadingCards({ label }: { label: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label={`Loading ${label}`}>
      <span className="sr-only">Loading {label}</span>
      {[0, 1, 2].map((item) => (
        <div className="rounded-xl border bg-card p-5" key={item}>
          <Skeleton className="mb-4 h-4 w-24" />
          <Skeleton className="mb-3 h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function formatDateRange(startDate: string, endDate: string) {
  return `${formatDate(startDate)} – ${formatDate(endDate)}`;
}
