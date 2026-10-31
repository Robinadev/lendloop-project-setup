"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Archive, Check, ClipboardList, Hammer, PackageOpen, RotateCcw, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CATEGORIES } from "@/convex/constants";
import type { ActionRunner, LoanStatus } from "@/components/lendloop/shared";
import { EmptyState, formatDateRange, LoadingCards, StatusBadge } from "@/components/lendloop/shared";
import { ToolForm } from "@/components/lendloop/tool-form";

type BrowseTool = {
  _id: Id<"tools">;
  name: string;
  category: string;
  condition: string;
  description: string;
  ownerName: string;
  ownerTrusted: boolean;
  mine: boolean;
  available: boolean;
};

type LoanItem = {
  _id: Id<"loans">;
  toolName: string;
  startDate: string;
  endDate: string;
  status: LoanStatus;
  ownerName: string;
  borrowerName: string;
  overdue: boolean;
};

type Listing = Pick<Doc<"tools">, "_id" | "name" | "category" | "condition" | "description"> & {
  available: boolean;
};

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function BrowseView({ isAdmin, run }: { isAdmin: boolean; run: ActionRunner }) {
  const [category, setCategory] = useState("all");
  const [requestingId, setRequestingId] = useState<Id<"tools"> | null>(null);
  const [busyId, setBusyId] = useState<Id<"tools"> | null>(null);
  const [range, setRange] = useState({ startDate: "", endDate: "" });
  const tools = useQuery(api.tools.listAll, { category: category === "all" ? undefined : category });
  const requestLoan = useMutation(api.loans.request);
  const removeTool = useMutation(api.tools.remove);

  const submitRequest = async (event: FormEvent<HTMLFormElement>, toolId: Id<"tools">) => {
    event.preventDefault();
    if (busyId) return;
    setBusyId(toolId);
    const saved = await run(
      () => requestLoan({ toolId, startDate: range.startDate, endDate: range.endDate }),
      "Request sent to the lender",
    );
    setBusyId(null);
    if (saved) {
      setRequestingId(null);
      setRange({ startDate: "", endDate: "" });
    }
  };

  const handleRemove = async (toolId: Id<"tools">) => {
    if (!window.confirm("Remove this listing from the board? Its loan history will be kept.")) return;
    await run(() => removeTool({ toolId }), "Listing removed");
  };

  if (tools === undefined) return <LoadingCards label="tools" />;

  return (
    <section className="flex flex-col gap-5" aria-labelledby="browse-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">The shared shelf</p>
          <h2 className="section-title" id="browse-title">Find a tool nearby</h2>
          <p className="text-sm text-muted-foreground">Only signed-in neighbors can see listing details and request dates.</p>
        </div>
        <Field className="min-w-44">
          <FieldLabel htmlFor="browse-category">Category</FieldLabel>
          <Select value={category} onValueChange={(value) => setCategory(value ?? "all")}>
            <SelectTrigger id="browse-category" aria-label="Filter tools by category" className="w-full">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {tools.length === 0 ? (
        <EmptyState
          title={category === "all" ? "No listings yet" : `No ${category.toLowerCase()} listings yet`}
          description="When a neighbor adds a tool, it will show up here."
          icon={PackageOpen}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(tools as BrowseTool[]).map((tool) => (
            <Card className="h-full" key={tool._id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Badge variant="secondary">{tool.category}</Badge>
                    <CardTitle className="mt-3 text-lg">{tool.name}</CardTitle>
                  </div>
                  <Badge variant={tool.available ? "outline" : "secondary"}>
                    {tool.available ? "Available" : "On loan"}
                  </Badge>
                </div>
                <CardDescription>{tool.condition} · shared by {tool.ownerName}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <p className="text-sm leading-relaxed text-muted-foreground">{tool.description}</p>
                {tool.ownerTrusted ? (
                  <Badge className="w-fit" variant="outline">
                    <ShieldCheck data-icon="inline-start" />
                    Trusted lender
                  </Badge>
                ) : null}
                {requestingId === tool._id ? (
                  <form className="flex flex-col gap-4 rounded-xl border bg-muted/30 p-4" onSubmit={(event) => submitRequest(event, tool._id)}>
                    <p className="text-sm font-medium">Choose the dates you need it.</p>
                    <FieldGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor={`start-${tool._id}`}>From</FieldLabel>
                        <Input
                          id={`start-${tool._id}`}
                          min={todayString()}
                          onChange={(event) => setRange((current) => ({ ...current, startDate: event.target.value }))}
                          required
                          type="date"
                          value={range.startDate}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor={`end-${tool._id}`}>Through</FieldLabel>
                        <Input
                          id={`end-${tool._id}`}
                          min={range.startDate || todayString()}
                          onChange={(event) => setRange((current) => ({ ...current, endDate: event.target.value }))}
                          required
                          type="date"
                          value={range.endDate}
                        />
                      </Field>
                    </FieldGroup>
                    <FieldDescription>The lender will confirm or decline your request.</FieldDescription>
                    <div className="flex flex-wrap gap-2">
                      <Button disabled={busyId === tool._id} size="sm" type="submit">
                        <Check data-icon="inline-start" />
                        {busyId === tool._id ? "Sending…" : "Send request"}
                      </Button>
                      <Button onClick={() => setRequestingId(null)} size="sm" type="button" variant="ghost">
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : null}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                {tool.available && !tool.mine ? (
                  <Button
                    disabled={busyId === tool._id}
                    onClick={() => {
                      setRequestingId(tool._id);
                      setRange({ startDate: "", endDate: "" });
                    }}
                    size="sm"
                    variant="outline"
                  >
                    <ClipboardList data-icon="inline-start" />
                    Request dates
                  </Button>
                ) : null}
                {tool.mine ? <Badge variant="outline">Your listing</Badge> : null}
                {isAdmin && !tool.mine ? (
                  <Button onClick={() => void handleRemove(tool._id)} size="sm" variant="destructive">
                    <Archive data-icon="inline-start" />
                    Remove listing
                  </Button>
                ) : null}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

export function ListingsView({ run }: { run: ActionRunner }) {
  const listings = useQuery(api.tools.mine);
  const removeTool = useMutation(api.tools.remove);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"tools"> | null>(null);

  const handleRemove = async (toolId: Id<"tools">) => {
    if (!window.confirm("Remove this listing from the board? Its loan history will be kept.")) return;
    await run(() => removeTool({ toolId }), "Listing removed");
  };

  if (listings === undefined) return <LoadingCards label="your listings" />;

  return (
    <section className="flex flex-col gap-5" aria-labelledby="listings-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your shelf</p>
          <h2 className="section-title" id="listings-title">Your listings</h2>
          <p className="text-sm text-muted-foreground">Add, edit, or remove a tool you&apos;re happy to share.</p>
        </div>
        <Button onClick={() => setShowForm((value) => !value)}>
          <Hammer data-icon="inline-start" />
          {showForm ? "Close form" : "List a tool"}
        </Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Add a listing</CardTitle>
            <CardDescription>Keep the details practical so neighbors know what to expect.</CardDescription>
          </CardHeader>
          <CardContent>
            <ToolForm run={run} onSaved={() => setShowForm(false)} />
          </CardContent>
        </Card>
      ) : null}

      {listings.length === 0 ? (
        <EmptyState
          title="Your shelf is waiting"
          description="List one of the tools you already own to help your neighborhood get more done."
          icon={Hammer}
          action={<Button onClick={() => setShowForm(true)}>Create your first listing</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(listings as Listing[]).map((tool) => (
            <Card key={tool._id}>
              {editingId === tool._id ? (
                <CardContent>
                  <ToolForm
                    key={tool._id}
                    initial={tool}
                    onCancel={() => setEditingId(null)}
                    onSaved={() => setEditingId(null)}
                    run={run}
                  />
                </CardContent>
              ) : (
                <>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Badge variant="secondary">{tool.category}</Badge>
                        <CardTitle className="mt-3 text-lg">{tool.name}</CardTitle>
                      </div>
                      <Badge variant={tool.available ? "outline" : "secondary"}>
                        {tool.available ? "Available" : "On loan"}
                      </Badge>
                    </div>
                    <CardDescription>{tool.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Condition: {tool.condition}</p>
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2">
                    <Button onClick={() => setEditingId(tool._id)} size="sm" variant="outline">Edit</Button>
                    <Button onClick={() => void handleRemove(tool._id)} size="sm" variant="destructive">
                      <Archive data-icon="inline-start" />
                      Remove
                    </Button>
                  </CardFooter>
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

export function RequestsView({ run }: { run: ActionRunner }) {
  const requests = useQuery(api.loans.myRequests);
  const cancelRequest = useMutation(api.loans.cancelRequest);
  const [busyId, setBusyId] = useState<Id<"loans"> | null>(null);

  const cancel = async (loanId: Id<"loans">) => {
    setBusyId(loanId);
    await run(() => cancelRequest({ loanId }), "Request cancelled");
    setBusyId(null);
  };

  if (requests === undefined) return <LoadingCards label="your requests" />;

  return (
    <section className="flex flex-col gap-5" aria-labelledby="requests-title">
      <div>
        <p className="eyebrow">Borrowing</p>
        <h2 className="section-title" id="requests-title">Your requests</h2>
        <p className="text-sm text-muted-foreground">Track dates and decisions for tools you&apos;ve requested.</p>
      </div>
      {requests.length === 0 ? (
        <EmptyState title="No requests yet" description="Browse the shared shelf and request dates when you need a tool." icon={ClipboardList} />
      ) : (
        <div className="grid gap-3">
          {requests.map((loan) => (
            <Card key={loan._id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-4">
                <div className="flex min-w-0 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-medium">{loan.toolName}</h3>
                    <StatusBadge status={loan.status} overdue={loan.overdue} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDateRange(loan.startDate, loan.endDate)} · lender {loan.ownerName}
                  </p>
                </div>
                {loan.status === "pending" ? (
                  <Button disabled={busyId === loan._id} onClick={() => void cancel(loan._id)} size="sm" variant="outline">
                    <X data-icon="inline-start" />
                    Cancel request
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

export function IncomingView({ run }: { run: ActionRunner }) {
  const incoming = useQuery(api.loans.incoming);
  const decide = useMutation(api.loans.decide);
  const markReturned = useMutation(api.loans.markReturned);
  const [busyId, setBusyId] = useState<Id<"loans"> | null>(null);

  const act = async (loanId: Id<"loans">, action: () => Promise<unknown>, message: string) => {
    setBusyId(loanId);
    await run(action, message);
    setBusyId(null);
  };

  if (incoming === undefined) return <LoadingCards label="incoming requests" />;

  return (
    <section className="flex flex-col gap-5" aria-labelledby="incoming-title">
      <div>
        <p className="eyebrow">Lending</p>
        <h2 className="section-title" id="incoming-title">Incoming requests</h2>
        <p className="text-sm text-muted-foreground">Approve or decline requests for your tools, then mark returns.</p>
      </div>
      {incoming.length === 0 ? (
        <EmptyState title="Nothing to review" description="Requests for your listings will appear here." icon={ClipboardList} />
      ) : (
        <div className="grid gap-3">
          {incoming.map((loan) => (
            <Card key={loan._id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-4">
                <div className="flex min-w-0 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-medium">{loan.toolName}</h3>
                    <StatusBadge status={loan.status} overdue={loan.overdue} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDateRange(loan.startDate, loan.endDate)} · requested by {loan.borrowerName}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {loan.status === "pending" ? (
                    <>
                      <Button
                        disabled={busyId === loan._id}
                        onClick={() => void act(loan._id, () => decide({ loanId: loan._id, approve: true }), "Request approved")}
                        size="sm"
                      >
                        <Check data-icon="inline-start" />
                        Approve
                      </Button>
                      <Button
                        disabled={busyId === loan._id}
                        onClick={() => void act(loan._id, () => decide({ loanId: loan._id, approve: false }), "Request declined")}
                        size="sm"
                        variant="outline"
                      >
                        <X data-icon="inline-start" />
                        Decline
                      </Button>
                    </>
                  ) : null}
                  {loan.status === "approved" ? (
                    <Button
                      disabled={busyId === loan._id}
                      onClick={() => void act(loan._id, () => markReturned({ loanId: loan._id }), "Loan marked returned")}
                      size="sm"
                      variant="outline"
                    >
                      <RotateCcw data-icon="inline-start" />
                      Mark returned
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

export function AdminView({ run }: { run: ActionRunner }) {
  const overview = useQuery(api.admin.overview);
  const setTrusted = useMutation(api.users.setTrusted);
  const retryDelivery = useMutation(api.notifications.retry);
  const [busyId, setBusyId] = useState<string | null>(null);

  const retry = async (deliveryId: Id<"deliveries">) => {
    setBusyId(String(deliveryId));
    await run(() => retryDelivery({ deliveryId }), "Notification retry queued");
    setBusyId(null);
  };

  if (overview === undefined) return <LoadingCards label="admin data" />;

  return (
    <section className="flex flex-col gap-5" aria-labelledby="admin-title">
      <div>
        <p className="eyebrow">Stewardship</p>
        <h2 className="section-title" id="admin-title">Admin overview</h2>
        <p className="text-sm text-muted-foreground">Manage trusted lenders and review system activity.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card size="sm"><CardHeader><CardDescription>Neighbors</CardDescription><CardTitle className="text-2xl">{overview.users.length}</CardTitle></CardHeader></Card>
        <Card size="sm"><CardHeader><CardDescription>Loan records</CardDescription><CardTitle className="text-2xl">{overview.loans.length}</CardTitle></CardHeader></Card>
        <Card size="sm"><CardHeader><CardDescription>Needs attention</CardDescription><CardTitle className="text-2xl">{overview.failedDeliveries.length + overview.workflowErrors.length}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trusted lenders</CardTitle>
          <CardDescription>Trusted status is visible to signed-in neighbors on listings.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {overview.users.map((user) => (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3" key={user._id}>
              <div className="min-w-0">
                <p className="font-medium">{user.name}</p>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {user.role === "admin" ? <Badge variant="secondary">Admin</Badge> : null}
                <Button
                  disabled={busyId === String(user._id)}
                  onClick={async () => {
                    setBusyId(String(user._id));
                    await run(() => setTrusted({ userId: user._id, trusted: !user.trustedLender }), user.trustedLender ? "Trusted status removed" : "Lender marked trusted");
                    setBusyId(null);
                  }}
                  size="sm"
                  variant={user.trustedLender ? "outline" : "secondary"}
                >
                  <ShieldCheck data-icon="inline-start" />
                  {user.trustedLender ? "Unmark trusted" : "Mark trusted"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification delivery</CardTitle>
          <CardDescription>Failed outbox events stay visible until they are retried.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {overview.failedDeliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No failed notifications.</p>
          ) : overview.failedDeliveries.map((delivery) => (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3" key={delivery._id}>
              <div className="min-w-0">
                <p className="font-medium">{delivery.type.replaceAll("_", " ")}</p>
                <p className="text-sm text-muted-foreground">{delivery.attempts} attempts · {delivery.lastError ?? "No error detail"}</p>
              </div>
              <Button disabled={busyId === String(delivery._id)} onClick={() => void retry(delivery._id)} size="sm" variant="outline">
                <RotateCcw data-icon="inline-start" />
                Retry
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>n8n workflow errors</CardTitle>
          <CardDescription>Signed workflow error write-backs from n8n.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {overview.workflowErrors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No workflow errors recorded.</p>
          ) : overview.workflowErrors.map((error) => (
            <div className="rounded-lg border p-3" key={error._id}>
              <p className="font-medium">{error.workflow}{error.node ? ` · ${error.node}` : ""}</p>
              <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
              <p className="mt-1 truncate font-mono text-xs text-muted-foreground">Execution {error.executionId}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />
      <Card>
        <CardHeader>
          <CardTitle>All loan activity</CardTitle>
          <CardDescription>Admin-only view across lenders and borrowers.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {overview.loans.length === 0 ? (
            <EmptyState title="No loan activity" description="Loan requests and returns will appear here." icon={PackageOpen} />
          ) : overview.loans.map((loan) => (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3" key={loan._id}>
              <div className="min-w-0">
                <p className="font-medium">{loan.toolName}</p>
                <p className="text-sm text-muted-foreground">{loan.borrowerName} · {loan.ownerName} · {formatDateRange(loan.startDate, loan.endDate)}</p>
              </div>
              <StatusBadge status={loan.status} overdue={loan.overdue} />
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
