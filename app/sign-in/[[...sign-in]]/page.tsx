import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/lendloop/auth-shell";

export default function SignInPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Pick up where your neighborhood left off."
      description="Sign in to browse private listing details, request dates, and manage the tools you lend."
    >
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/dashboard" />
    </AuthShell>
  );
}
