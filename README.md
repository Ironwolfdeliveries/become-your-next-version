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
- **Customer journey:** `/assessment` creates a preliminary Snapshot, `/create-account` saves it after authentication, and the member journey continues through `/architect-assessment`, `/blueprint`, and `/dashboard`.

## Environment

Copy `.env.example` to `.env.local`. Account and persistence features require a provisioned Supabase project.

| Variable | Use |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical production URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase publishable key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Legacy fallback for projects still using the anon key name |
| `DATABASE_URL` | Optional direct Postgres connection for migration tooling only |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Checkout and webhook verification |
| `RESEND_API_KEY`, `EMAIL_FROM` | Transactional email |
| `OPENAI_API_KEY` | Server-side Kai inference |
| `ANALYTICS_WRITE_KEY` | Consent-aware analytics |
| `POD_API_KEY`, `POD_WEBHOOK_SECRET` | Print-on-demand catalogue and fulfilment |

Never prefix secrets with `NEXT_PUBLIC_`. Validate them server-side before enabling a live adapter.

## Database setup

Apply `supabase/migrations/202608300001_bynv_accounts.sql` to the linked Supabase project. Configure the production site URL and allow these authentication redirects:

- `https://www.becomeyournextversion.com/auth/callback`
- `https://www.becomeyournextversion.com/update-password`
- the equivalent Vercel preview origins used for testing

## Deliberately disconnected

Paid membership, payment processing, merchandise checkout/fulfillment, outbound marketing email, and live Kai AI are not connected. No scripted response is presented as live Kai coaching. Version Scores remain educational self-reflection aids—not clinical, diagnostic, medical, or scientifically validated measures. See `/disclaimer` and `/privacy`.
