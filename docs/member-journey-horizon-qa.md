# Member journey / horizon pass — 2026-09-14

## Boundaries

- Existing production baseline: ef2e353. No public conversion flag or Stripe price changed.
- No bank, entity, NJ registration, real charge, subscription, or paid AI call created.
- Existing owner receives internal active Architect Coaching via the existing audited admin RPC; owner role retained and Kai Live beta remains off.
- Owner assessment checksum matched before/after the access update. No assessment answers, reflections or scores were edited.
- Coaching is an owner/admin-only, in-memory QA rehearsal. It does not book a coach or persist notes; refresh resets it. Public coaching remains unavailable.

## Implementation

One shared member-state resolver chooses assessment, cycle, Daily Focus or a safe dashboard fallback. Blueprint priorities feed a 14-day default cycle and suggested daily action. Completion saves a Blueprint; viewing it no longer rewrites it. Assessment hydration no longer autosaves unchanged answers.

Owner checkout is disabled in the interface and rejected server-side. Offer preview does not alter entitlement. Kai prompts reuse the existing Guided interface; personal context excludes journal entries.

## Verification

Local lint, typecheck, Guided Kai safeguards, billing gates/access tests, journey-state tests and production build passed. Journey tests cover anonymous, unfinished, completed/no cycle, active cycle, unavailable state and logout, plus cycle progress and owner-only coaching step guards. These are logic tests, not six completed browser journeys.

Authenticated browser walkthrough requires Daniel's existing account login; do not manufacture sessions or edit his assessment for testing. Real coaching delivery/calendar, voice quality and real Stripe transactions are not claimed as validated.

## Imagery

Generated with the built-in image tool and compressed to WebP. Mountain photo derived from Daniel's supplied mockup, removing screenshot UI/text and preserving the sunrise, mountains and back-facing Architect hoodie. Supporting prompt: warm cinematic photograph of friends walking through golden foothills, human connection and possibility, no text or testimonial implication. Images illustrate the brand, not actual members or guaranteed results. Motivational lines are original BYNV copy; no celebrity quotes or invented social proof.

## Deliberately not shipped

Public paid reopening; paid voice/AI services; simulated coaching presented as real service; unverified customer claims. Browser speech remains optional and unshipped pending an actual voice-quality check.
