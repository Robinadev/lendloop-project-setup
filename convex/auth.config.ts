import type { AuthConfig } from "convex/server";

// This is the generated development app's issuer; replace it when switching to a production Clerk app.
const issuerDomain = "https://feasible-lioness-5019.clerk.accounts.dev";

export default {
  providers: [{ domain: issuerDomain, applicationID: "convex" }],
} satisfies AuthConfig;
