import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/lendloop/auth-shell";

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="Join your neighborhood"
      title="Sharing starts with one small yes."
      description="Create an account to lend a tool, borrow for a few days, and keep the local shelf moving."
    >
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/dashboard" />
    </AuthShell>
  );
}
