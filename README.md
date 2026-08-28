# BYNV — Become Your Next Version

A production-ready Stage 1 marketing and product-demo application for **Become Your Next Version**. BYNV helps people reflect, choose a focus, and turn it into a practical next step through The Architect Method, the Version Score assessment, and Kai, a future AI coach.

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
| `npm test` | Run all Stage 1 checks (lint + typecheck) |

## Continuous integration

GitHub Actions runs lint, typecheck, and a production build for pull requests and pushes to `main`. Because the repository does not yet contain a lockfile, CI uses `npm install --no-audit --no-fund` and intentionally leaves npm caching disabled; switch to `npm ci` with setup-node caching after committing a lockfile.

## Architecture

- **Next.js App Router + TypeScript:** routes, metadata, generated sitemap/robots, loading and error boundaries live in `app/`.
- **Tailwind CSS:** brand tokens, layout primitives, accessibility states, and responsive styling are defined in `app/globals.css` and `tailwind.config.ts`.
- **Reusable UI:** navigation, footer, calls to action, cards, JSON-LD, and interactive demos live in `components/`.
- **Typed local content:** navigation, framework, products, FAQs, and resources live in `lib/data.ts`; no unsupported social proof is used.
- **Safe adapters:** `lib/services.ts` exposes mock-first boundaries for assessment, early access, contact, Kai, and commerce. No secret is shipped to the browser.
- **Progressive demo journey:** `/assessment` stores only demo answers in `sessionStorage`, `/version-score` calculates a clearly labelled indicative score, and `/dashboard` shows the next-step plan.

## Environment

Copy `.env.example` to `.env.local`. Stage 1 works without credentials.

| Variable | Future use |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical production URL |
| `DATABASE_URL` | Managed Postgres connection (server only) |
| `AUTH_SECRET` | Authentication session signing |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Checkout and webhook verification |
| `RESEND_API_KEY`, `EMAIL_FROM` | Transactional email |
| `OPENAI_API_KEY` | Server-side Kai inference |
| `ANALYTICS_WRITE_KEY` | Consent-aware analytics |
| `POD_API_KEY`, `POD_WEBHOOK_SECRET` | Print-on-demand catalogue and fulfilment |

Never prefix secrets with `NEXT_PUBLIC_`. Validate them server-side before enabling a live adapter.

## Integration roadmap

1. **Authentication:** add an Auth.js-compatible provider, verified email flow, protected dashboard layout, session rotation, and account deletion/export.
2. **Database:** provision Postgres, add migrations and row-level ownership for profiles, assessments, plans, journal entries, consent, and event audit records.
3. **Stripe:** create server-owned prices, Checkout sessions and customer portal; verify webhook signatures; make membership state webhook-driven; add tax/refund workflows.
4. **Email:** connect a transactional provider, verify the sending domain, add double opt-in and unsubscribe handling, and replace mock form receipts.
5. **Analytics:** implement a consent banner, privacy-preserving event taxonomy, retention limits, and funnel events from assessment start through membership interest.
6. **Kai AI:** add an authenticated server route, model safety policy, moderation, rate limits, retrieval from opted-in user context, deletion controls, evaluations, and human escalation language. Kai must not present medical or crisis advice.
7. **Print on demand:** synchronize signed supplier product data, variants and inventory; connect Stripe orders to fulfilment using idempotent, verified webhooks; add shipping, returns, tax and customer-support operations.
8. **Production:** configure the canonical URL, CSP/security headers, observability and alerting; run accessibility, browser, performance and security reviews before launch.

## Stage 1 limitations

Forms and commerce are intentionally demonstrations: no account is created, no payment is taken, no email is sent, and Kai uses scripted local responses. The Version Score is a reflection aid—not a clinical, diagnostic, medical, or scientifically validated measure. See `/disclaimer` and `/privacy`.
