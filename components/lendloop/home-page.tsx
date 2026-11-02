"use client";

import Link from "next/link";
import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ArrowDown, ArrowRight, Hammer, Leaf, Repeat2, Sparkles, TentTree, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, LoadingCards } from "@/components/lendloop/shared";

export function HomePage() {
  const { isLoaded, isSignedIn } = useAuth();
  const tools = useQuery(api.tools.listPublic);

  return (
    <main>
      <header className="site-wrap site-header">
        <Link className="brand" href="/" aria-label="LendLoop home">
          <span className="brand-mark"><Repeat2 aria-hidden="true" /></span>
          <span>LendLoop</span>
        </Link>
        <nav className="flex items-center gap-3" aria-label="Main navigation">
          <Link className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline" href="#tools">Browse tools</Link>
          {isLoaded && (isSignedIn ? (
            <>
              <Link className={buttonVariants({ size: "sm", variant: "outline" })} href="/dashboard">
                Open workspace
                <ArrowRight data-icon="inline-end" />
              </Link>
              <UserButton />
            </>
          ) : (
            <>
              <SignInButton mode="modal">
                <Button size="sm" variant="outline">Sign in</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm">Join LendLoop</Button>
              </SignUpButton>
            </>
          ))}
        </nav>
      </header>

      <section className="site-wrap home-hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <Badge className="mb-5" variant="outline">
              <Sparkles data-icon="inline-start" />
              Neighbor-to-neighbor sharing
            </Badge>
            <h1 className="hero-title">Good tools.<br /><span>Closer to home.</span></h1>
            <p className="hero-lede">Borrow what you need. Lend what you don&apos;t. LendLoop makes it easier to share useful things with the people around you.</p>
            <div className="flex flex-wrap items-center gap-3">
              {isLoaded && (isSignedIn ? (
                <Link className={buttonVariants({ size: "lg" })} href="/dashboard">
                  Open your board
                  <ArrowRight data-icon="inline-end" />
                </Link>
              ) : (
                <>
                  <SignInButton mode="modal">
                    <Button size="lg">
                      Sign in to lend or borrow
                      <ArrowRight data-icon="inline-end" />
                    </Button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <Button size="lg" variant="ghost">Create an account</Button>
                  </SignUpButton>
                </>
              ))}
            </div>
            <a className="hero-scroll-link" href="#tools">
              See what&apos;s available
              <ArrowDown aria-hidden="true" />
            </a>
          </div>

          <Card className="hero-card">
            <CardHeader>
              <Badge className="w-fit" variant="secondary">A better kind of neighborhood</Badge>
              <CardTitle className="hero-card-title">Make the useful things go further.</CardTitle>
              <CardDescription>Share with care, borrow for the days you need, and keep ownership close to home.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="hero-art" aria-hidden="true">
                <div className="hero-art-orbit" />
                <div className="hero-art-icons">
                  <span><Hammer /></span>
                  <span><Leaf /></span>
                  <span><TentTree /></span>
                </div>
                <div className="hero-art-center"><Wrench /></div>
              </div>
            </CardContent>
            <CardFooter className="hero-card-footer">Less buying for one-time jobs. More getting things done together.</CardFooter>
          </Card>
        </div>
      </section>

      <section className="site-wrap tools-section" id="tools" aria-labelledby="tools-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">The public shelf</p>
            <h2 className="section-title" id="tools-title">Available to borrow</h2>
            <p className="text-muted-foreground">A live list of tools neighbors have marked available. Owner details stay private on this page.</p>
          </div>
          {isLoaded && (isSignedIn ? (
            <Link className={buttonVariants({ variant: "outline" })} href="/dashboard">Open workspace</Link>
          ) : (
            <SignInButton mode="modal">
              <Button variant="outline">Sign in to request</Button>
            </SignInButton>
          ))}
        </div>

        {tools === undefined ? (
          <LoadingCards label="available tools" />
        ) : tools.length === 0 ? (
          <EmptyState
            title="The shelf is ready for its first tool"
            description="When someone lists an available tool, it will appear here."
            icon={Hammer}
          />
        ) : (
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
        )}
      </section>

      <footer className="site-wrap site-footer">
        <Link className="brand" href="/">
          <span className="brand-mark"><Repeat2 aria-hidden="true" /></span>
          <span>LendLoop</span>
        </Link>
        <p>Good neighbors make good use of what they already have.</p>
      </footer>
    </main>
  );
}
