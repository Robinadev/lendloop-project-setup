import type { ReactNode } from "react";
import Link from "next/link";
import { Repeat2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-page">
      <div className="site-wrap auth-wrap">
        <Link className="brand" href="/" aria-label="Back to LendLoop home">
          <span className="brand-mark"><Repeat2 aria-hidden="true" /></span>
          <span>LendLoop</span>
        </Link>
        <div className="auth-grid">
          <section className="auth-copy">
            <Badge className="mb-4" variant="outline">{eyebrow}</Badge>
            <h1 className="auth-title">{title}</h1>
            <p className="max-w-md text-muted-foreground">{description}</p>
          </section>
          <div className="auth-widget">{children}</div>
        </div>
        <p className="auth-footnote">Borrow thoughtfully. Return with care.</p>
      </div>
    </main>
  );
}
