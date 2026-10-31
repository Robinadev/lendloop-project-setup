import type { AuthConfig } from "convex/server";

const issuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN ?? "https://set-colt-2205.clerk.accounts.dev";

export default {
  providers: [{ domain: issuerDomain, applicationID: "convex" }],
} satisfies AuthConfig;
