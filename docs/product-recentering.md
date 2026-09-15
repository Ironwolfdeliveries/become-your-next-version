# BYNV product recentering — 15 September 2026

## Product behavior

The member journey is now Blueprint → orientation → priority → a guided 14-day Cycle → Today’s Plan → check-in → adjustment → progress → next Cycle.

- Kai opens the dashboard with a next move grounded in the saved assessment, active Cycle, today’s steps, unfinished commitments, or a due review. Supporting tools sit below that work.
- A six-step personalized orientation introduces the method without autoplay audio. A captioned video can be added later; no video/audio asset is claimed to exist.
- Today’s Plan holds one priority and one to three steps. Members can accept, edit, replace, or add steps and record Got it done, Made progress, or Didn’t happen. Notes remain optional.
- Recovery keeps the original history and saves a keep/shrink/reschedule/replace action. A full or completed target day is rejected instead of overwritten. Concurrent saves are rejected with a reload message.
- Goals use ordinary language, optional desired dates and constructive commitment rules; existing goals can be edited, advanced, or completed. A saved goal can seed its Cycle.
- Progress separates completed actions, Build Streaks, Cycles, goals, and saved Version Scores. Reassessment creates a new version; original results remain intact.
- Architect Library keeps the three existing PDFs and adds twelve original guided resources: four free, four Foundation, two Builder, two Architect. Premium content is loaded on the server only after entitlement verification. Category counts describe existing content. No generated audio or unsupported effects are advertised.
- Guided and Live Kai use member-local dates, latest completed results, selected Cycle steps, actual action totals and bounded pending-action context. Private journal content, reflections and blockers are excluded from automatic Live context. Existing cost and entitlement gates remain in place.

## Data and release boundaries

The production baseline was commit 556a480. Before/after checksums confirmed the existing assessment answers and section results, saved score 59, Blueprint, original Daily Focus fields, original Cycle fields, and account-access record were unchanged by the additive migration.

Existing legacy actions are interpreted as one step on read. They are not backfilled. Empty legacy rows are not invented commitments. Member-local dates default to America/New_York for existing accounts; orientation saves the browser timezone.

Completed assessments and Blueprint content are protected against accidental edits. The assessment RPC computes scores and saves the matching Blueprint atomically. Account-erasure cascades remain supported.

No checkout price, Stripe webhook/portal behavior, Kai cost cap, live beta setting, or public paid-enrollment authorization flag was changed. Public paid enrollment remains closed until the owner reopens it.

## Verification

- npm test: lint, TypeScript, Guided Kai safety/privacy/cost guards, billing gates/access, journey routing, 34 experience-state tests, library entitlement matrix, and full-assessment question/scoring contract.
- Production build passed.
- Experience and assessment migrations were tested together in isolated PostgreSQL. Both transactional scripts were also run successfully against production with synthetic users and ROLLBACK; no QA data remained.
- Database coverage: legacy preservation, own-row access and cross-account denial, atomic completion/rollback, stale saves, duplicate active Cycles, midnight boundaries, partial/missed/done consistency, recovery merge/full/complete targets, early/due review and next-Cycle continuation.
- Seven isolated React/jsdom scenarios exercised the actual orientation, Cycle, Today’s Plan and dashboard components. These used synthetic persistence and mocked Next navigation; actual persistence is covered by the SQL tests.
- Browser limitation: the current browser cannot reach the local preview, and the production browser is signed out. Visual layout and the full authenticated User #1 browser walkthrough have not been established by these tests. No login session was manufactured and no owner account activity was simulated.

## Release status

The complete implementation is committed on the local codex/product-recentering branch. Both additive database migrations have been applied and verified in production; their filenames match the actual migration-history versions.

Publication of the application code is blocked. Automatic approval review rejected the GitHub push because the request did not explicitly authorize publishing changes to the public repository. The code has not been pushed, merged or deployed. The production website still serves baseline 556a480. The next action requiring owner approval is publishing this finished branch to Ironwolfdeliveries/become-your-next-version, merging after CI/preview verification, and deploying the member experience while preserving the public paid-enrollment hold.

## Reproduce the database checks

Apply the two ordered migrations in supabase/migrations whose names end with product_recentering and preserve_account_erasure. The matching verification sources are docs/experience-verification.sql and docs/assessment-preservation-test.sql. Both wrap their synthetic data in a transaction and roll back. Do not remove that rollback or run fixtures as member data.
