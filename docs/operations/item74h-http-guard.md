# Item 74H protected-route HTTP guard

Status: hotfix acceptance. Production checkout remains disabled.

## Invariant

The internal Item 74H acceptance route must return an actual HTTP 404 before page rendering or session creation whenever its exact Preview environment, branch and checkout-disabled conditions are not satisfied.

The application uses `src/app`, so Next.js middleware must live at `src/middleware.ts`. A repository-root `middleware.ts` is not a valid compiled boundary for this project layout.

## Session compatibility

Middleware runs in the Edge runtime and must not import the Node-only authentication module, Prisma, email transports or credentials. The dedicated Edge-safe codec preserves the existing `np_session` payload, HMAC-SHA256 signature, secret precedence, cookie name and attributes. Compatibility tests compare its output with Node's HMAC implementation and reject tampered signatures.

No secret value is printed, copied, documented or exposed.

## Acceptance

The dedicated GitHub gate requires:

- `src/middleware.ts` exists and the obsolete root file does not;
- middleware does not import `@/lib/auth`;
- denied Item 74H requests return status 404 with `no-store` and `noindex`;
- denied requests do not create an anonymous session;
- ordinary routes retain anonymous-session creation;
- `/api/projects/ensure` retains its cookie exemption;
- Edge and server session tokens remain wire-compatible.

The exact-head Vercel Preview must compile and deny this hotfix branch with a real 404 because it is not the separately approved protected-content branch. After a green merge, the public Production URL must also return a real 404 and disclose no protected acceptance content.

## Boundaries

This hotfix changes no Prisma schema, database data, planning evidence, payment state, credentials, customer documents or checkout flag. It does not authorise Production checkout. The previously accepted progressive-evidence proof remains unchanged.
