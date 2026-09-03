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

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Check TypeScript without emitting files |
| `npm test` | Run lint and TypeScript checks |

## Continuous integration

Commit the lockfile and use `npm ci`, lint, typecheck, and an optimized production build in continuous integration.

## Architecture

- **Next.js App Router + TypeScript:** routes, metadata, generated sitemap/robots, loading and error boundaries live in `app/`.
- **Tailwind CSS:** brand tokens, layout primitives, accessibility states, and responsive styling are defined in `app/globals.css` and `tailwind.config.ts`.
- **Reusable UI:** navigation, account controls, assessment surfaces, member tools, calls to action, and JSON-LD live in `components/`.
- **Typed local content:** navigation, framework, products, FAQs, and resources live in `lib/data.ts`; no unsupported social proof is used.
- **Supabase Auth + Postgres:** cookie-based SSR sessions, protected routes, row-level security, and migrations live in `lib/supabase/`, `middleware.ts`, and `supabase/migrations/`.
- **Configurable assessment:** the 42-question V1 bank and scoring live in `lib/architect-assessment.ts`, independently of the UI.
- **Customer journey:** `/assessment` creates a preliminary Snapshot, `/create-account` saves it after authentication, and the member journey continues through `/architect-assessment`, `/blueprint`, `/dashboard`, member tools, and `/community`.
- **Membership billing:** Stripe Checkout and Customer Portal routes live in `app/api/billing/`; signed webhooks synchronize Supabase membership and Community entitlement records.
- **Kai:** `app/api/kai/route.ts` authenticates every request, applies moderation and assessment safeguards, selects only permitted private context, and persists conversations behind RLS.
- **Community operations:** `/admin/community` is restricted to moderator/admin entitlements; only admins can grant First Circle, Priority, Mastermind, or elevated roles.

## Environment

Copy `.env.example` to `.env.local`. Account and persistence features require a provisioned Supabase project.

| Variable | Use |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical production URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase publishable key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Legacy fallback for projects still using the anon key name |
| `SUPABASE_SERVICE_ROLE_KEY` | Protected server-only membership, webhook, invitation, and email operations |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Subscription Checkout, Portal, and signed webhook verification |
| `STRIPE_FOUNDATION_INTRO_PRICE_ID`, `STRIPE_FOUNDATION_PRICE_ID` | Foundation launch sequence: two paid introductory months, then the standard monthly rate |
| `STRIPE_BUILDER_PRICE_ID`, `STRIPE_ARCHITECT_PRICE_ID` | Builder and Architect recurring prices |
| `STRIPE_ARCHITECT_COACHING_PRICE_ID`, `STRIPE_GRADUATE_PRICE_ID` | Future gated Coaching and eligible Graduate recurring prices |
| `RESEND_API_KEY`, `EMAIL_FROM` | Branded transactional email; the public reply/support address is centralized in `lib/contact.ts` |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Server-side Kai inference; model defaults to `gpt-5-mini` |

Never prefix secrets with `NEXT_PUBLIC_`. Validate them server-side before enabling a live adapter.

## Database setup

Apply all SQL files in `supabase/migrations/` in filename order. Configure the production site URL and allow these authentication redirects:

- `https://www.becomeyournextversion.com/auth/callback`
- `https://www.becomeyournextversion.com/update-password`
- the equivalent Vercel preview origins used for testing

Configure Supabase Auth to use the templates in `supabase/email-templates/` after branded SMTP is verified. Configure Stripe to send Checkout, subscription, and invoice events to `/api/billing/webhook`. Foundation Checkout starts with a 30-day trial, then the webhook attaches a two-month $19.99 phase followed by the $29.99 Foundation phase.

## Configuration gates

Billing, live Kai, and branded email fail closed until their production credentials are configured. Merchandise remains a visual catalogue without checkout or fulfillment. No scripted response is presented as live Kai coaching, and no transaction is simulated. Version Scores remain educational self-reflection aids—not clinical, diagnostic, medical, or scientifically validated measures. See `/disclaimer` and `/privacy`.
