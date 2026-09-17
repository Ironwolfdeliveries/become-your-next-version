# Momentum, accountability, and personalization

September 17, 2026

Members now have a Momentum destination for their current Cycle, today's actions, honest check-ins, unfinished commitments, recovery decisions, goals, milestones, and evidence of change. The dashboard and member navigation point into it. Existing `/progress` links remain valid.

## Changes

- Recovery Check-In asks what got in the way, then saves keep, smaller, move, or replace. The original action stays in history and the next action is scheduled atomically.
- Goals begin with the member's own direction, followed by why it matters, a sign of progress, an optional area, and optional timing/support. Blueprint suggestions and broad examples require opening help.
- Goals and Cycles support optional constructive commitment responses and personal rewards. No virtual currency or penalty system was added.
- Completing a goal or Cycle requires a short change-and-evidence review. Three further questions are optional. “No clear change yet” is valid. Saved starting intentions and linked completed actions are available during review.
- Reopened goals retain earlier reviews and require a new review before being completed again. Cycle continuation can reuse what the member chose to carry forward.
- Kai recognizes recovery, completion, inactivity, approaching goal dates, Cycle review, and recent assessment changes. Guided and Live cost controls remain in place; private review text is not added to automatic Live context.
- Tool introductions are shorter, Kai's longer explanations are optional, and Momentum connects members to existing library resources. Existing tier enforcement remains authoritative.

## Data and migration

Migration `20260917012747_momentum_personalization.sql` adds nullable fields and authenticated, security-invoker validation. No existing member rows are rewritten. Checksums for assessments, Blueprints, daily entries, Cycles, goals, profiles, and access records matched before and after production migration. Completed assessment and Blueprint protections are unchanged.

Database guards enforce change reviews for completion, including direct Data API writes and legacy completion calls. Atomic recovery and stale-write checks remain in force. Historical completions remain readable without fabricating reviews.

Paid enrollment stays closed. Authentication, membership, library entitlements, and Guided/Live Kai gating are preserved.

## Verification

- `npm test`: lint, types, existing billing/Kai/assessment/journey/library safeguards, and 11 Momentum cases pass.
- `npm run build`: production build passes, including `/momentum` and `/progress`.
- `test/interaction`: 13 real-component integration scenarios pass, including five different member-chosen goal directions, recovery, review, and Momentum. Seven-area guidance plus legacy-area checks also pass. Network persistence and navigation are mocked here.
- `test/database`: isolated PostgreSQL verifies existing preservation suites and five full Momentum journeys, including RLS, stale writes, atomic recovery, evidence guards, review history, and unchanged baseline assessment data.
- `docs/momentum-verification.sql`: the five-profile suite also passes in production inside a transaction that rolls back all synthetic records.
- Supabase security advisories are unchanged: two existing backend-only tables have RLS without member policies; the pre-existing [leaked-password protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) remains.

Run component checks with `npm ci --prefix test/interaction`, then `node test/interaction/build.mjs`, `node test/interaction/run.mjs`, and `node test/interaction/guidance.mjs`. Run isolated SQL checks with `npm ci --prefix test/database` and `node test/database/verify.mjs`. Both suites are included in CI.

Authenticated browser visual verification remains unperformed: an owner browser session was not available. Component interactions and real database behavior were verified separately; these checks do not claim to replace that visual review.
