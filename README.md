# BYNV — Become Your Next Version

A Next.js application for **Become Your Next Version**. It includes the public Version Snapshot, secure Supabase accounts, the deeper Architect Assessment, deterministic Blueprint generation, and a persistent member operating system.

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Node 20+ is recommended.

## Commands

| Command             | Purpose                                 |
| ------------------- | --------------------------------------- |
| `npm run dev`       | Start the Next.js development server    |
| `npm run build`     | Create a production build               |
| `npm run start`     | Serve the production build              |
| `npm run lint`      | Run ESLint                              |
| `npm run typecheck` | Check TypeScript without emitting files |
| `npm test`          | Run lint, typecheck, Guided Kai, and billing-gate checks |

## Continuous integration

Commit the lockfile and use `npm ci`, lint, typecheck, and an optimized production build in continuous integration.

## Architecture

Product decisions and completion standards are governed by [the BYNV Product Operating Standard](content/operating-principles.md). It defines the quality, verification, Kai leadership, founder-authenticity, User #1, and scope-control rules used alongside this technical architecture.

- **Next.js App Router + TypeScript:** routes, metadata, generated sitemap/robots, loading and error boundaries live in `app/`.
- **Tailwind CSS:** brand tokens, layout primitives, accessibility states, and responsive styling are defined in `app/globals.css` and `tailwind.config.ts`.
- **Reusable UI:** navigation, account controls, assessment surfaces, member tools, calls to action, and JSON-LD live in `components/`.
- **Typed local content:** navigation, framework, products, FAQs, and resources live in `lib/data.ts`; no unsupported social proof is used.
- **Supabase Auth + Postgres:** cookie-based SSR sessions, protected routes, row-level security, and migrations live in `lib/supabase/`, `middleware.ts`, and `supabase/migrations/`.
- **Configurable assessment:** the 42-question V1 bank and scoring live in `lib/architect-assessment.ts`, independently of the UI.
- **Customer journey:** `/assessment` creates a preliminary Snapshot, `/create-account` saves it after authentication, and the member journey continues through `/architect-assessment`, `/blueprint`, `/dashboard`, member tools, and `/community`.
- **Membership billing:** Stripe Checkout and Customer Portal routes live in `app/api/billing/`; signed webhooks synchronize Supabase membership and Community entitlement records.
- **Kai:** `app/api/kai/route.ts` supports anonymous and authenticated Guided Kai, applies deterministic urgent-safety and assessment safeguards before ordinary coaching, and permits Live Kai Beta only after every server, owner, entitlement, shutoff, allowance, and budget gate passes. Only authenticated conversations are persisted behind RLS, and only explicitly permitted member context is supplied to Kai.
- **Community operations:** `/admin/community` is restricted to moderator/admin entitlements; only admins can grant First Circle, Priority, Mastermind, or elevated roles.

## Environment

Copy `.env.example` to `.env.local`. Account and persistence features require a provisioned Supabase project.

| Variable                                                         | Use                                                                                                                        |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                                           | Canonical production URL                                                                                                   |
| `NEXT_PUBLIC_SUPABASE_URL`                                       | Supabase project URL                                                                                                       |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`                           | Browser-safe Supabase publishable key                                                                                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`                                  | Legacy fallback for projects still using the anon key name                                                                 |
| `SUPABASE_SERVICE_ROLE_KEY`                                      | Protected server-only membership, webhook, invitation, and email operations                                                |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`                     | Subscription Checkout, Portal, and signed webhook verification                                                             |
| `BILLING_LIVE_ENABLED`                                           | Final owner-controlled commercial gate. Keep `false` in production throughout the pre-launch hold; use `true` only in an isolated Stripe test-mode environment for authorized verification until launch is approved. |
| `STRIPE_TAX_ENABLED`                                             | Human attestation that the live Stripe account's business details, required tax registrations, product tax codes, price tax behavior, and test results have been verified. This flag does not inspect Stripe automatically. |
| `STRIPE_FOUNDATION_INTRO_PRICE_ID`, `STRIPE_FOUNDATION_PRICE_ID` | Foundation launch sequence: 30 days with no membership charge, exactly 60 days at the introductory monthly rate, then the standard monthly rate |
| `STRIPE_BUILDER_PRICE_ID`, `STRIPE_ARCHITECT_PRICE_ID`           | Builder and Architect recurring prices                                                                                     |
| `STRIPE_ARCHITECT_COACHING_PRICE_ID`, `STRIPE_GRADUATE_PRICE_ID` | Future gated Coaching and eligible Graduate recurring prices                                                               |
| `RESEND_API_KEY`, `EMAIL_FROM`                                   | Branded transactional email; the public reply/support address is centralized in `lib/contact.ts`                           |
| `KAI_MODE`, `KAI_LIVE_BETA_ENABLED`, `KAI_EMERGENCY_SHUTOFF`     | Independent server gates for controlled Live Kai Beta. An API key alone cannot activate it.                                |
| `OPENAI_API_KEY`, `OPENAI_MODEL`                                 | Server-only Live Kai Beta inference; Guided Kai does not require or use them.                                              |
| `KAI_LIVE_BETA_*`                                                | Per-minute/day/month allowances, input/output limits, request reserve, pricing rates, and internal monthly budget ceiling. |

Never prefix secrets with `NEXT_PUBLIC_`. Validate them server-side before enabling a live adapter.

## Database setup

Apply all SQL files in `supabase/migrations/` in filename order. Configure the production site URL and allow these authentication redirects:

- `https://www.becomeyournextversion.com/auth/callback`
- `https://www.becomeyournextversion.com/update-password`
- the equivalent Vercel preview origins used for testing

Configure Supabase Auth to use the templates in `supabase/email-templates/` after branded SMTP is verified. Configure Stripe to send Checkout, subscription, and invoice events to `/api/billing/webhook`. Foundation Checkout starts with 30 days with no membership charge, followed by exactly 60 days at $19.99 per month, then the $29.99-per-month Foundation phase beginning on day 91. Verify those exact boundaries with Stripe test clocks before commercial activation; do not substitute two calendar months for the approved 60-day introductory period.

## Configuration gates

Treat billing as closed unless `BILLING_LIVE_ENABLED=true`, `STRIPE_TAX_ENABLED=true`, and the required Stripe, webhook, Supabase service-role, and price configuration are all present. The two flags are deliberate owner/operator attestations, not proof that company registration, legal review, Stripe Tax registrations, product tax treatment, webhook delivery, or end-to-end Checkout behavior are correct. In production, keep them `false` until those external requirements and the complete test-mode billing journey are verified and recorded. An isolated deployment using Stripe test-mode keys may enable them temporarily for authorized verification. Branded email independently fails closed until its production configuration is ready.

Guided Kai is the default and no-model-cost fallback. Urgent-safety routing and assessment safeguards run before ordinary Guided or Live coaching. Live Kai Beta additionally requires its server gates, owner-controlled database switch, disabled emergency shutoff, an owner or individually approved active account, atomic operational allowance/budget reservation, and the configured model credential. A failed Live gate falls back to Guided Kai; it does not weaken the safety or assessment rules. Merchandise remains a visual catalogue without checkout or fulfillment. Version Scores remain educational self-reflection aids—not clinical, diagnostic, medical, or scientifically validated measures. See `/disclaimer` and `/privacy`.
