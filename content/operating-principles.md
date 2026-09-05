# BYNV Product Operating Standard

This document is the operating source of truth for deciding how BYNV work is built, reviewed, and marked complete. It improves execution without replacing approved product, brand, pricing, assessment, or launch decisions.

## Priority order

When priorities compete, use this order:

1. Trust
2. Product usability
3. Conversion
4. Retention and member value
5. Launch readiness
6. Polish

Two exceptions override that normal product-priority order:

1. **Immediate safety, privacy, security, billing-integrity, or truthful-capability risk comes first.** Do not preserve conversion, continuity, or polish at the expense of preventing credible harm or materially misleading a member.
2. **While BYNV is in PRE-LAUNCH AWARENESS, launch readiness comes before promoted conversion.** Public conversion campaigns, ads, social calls to action, and acquisition outreach may be prepared, but they must not be published or activated before the hold is explicitly lifted and every applicable readiness gate is verified. Existing direct site and account flows may remain available for Daniel's User #1 work and explicitly approved testing; billing remains separately fail-closed.

Preserve working systems. Do not start a redesign, new product, or broad refactor when a focused correction solves the verified problem.

## Consistent public standard

Audience size does not lower the quality bar. Anything customer-facing should feel intentional, coherent, and complete whether it is seen by five people or five thousand.

Important journeys require experience-level verification. Code existing, a build passing, or a deployment becoming ready is necessary evidence, but none of those alone proves the customer experience is complete.

Critical journeys include:

- Account creation, sign-in, recovery, session persistence, and logout
- Version Snapshot completion, scoring, results, and continuation
- Architect Assessment completion, save, resume, and results
- Dashboard and Daily OS actions
- Ask Kai and other Kai coaching surfaces
- Pricing, checkout, billing, and entitlement changes before and whenever billing is enabled
- Community participation and privacy boundaries
- Transactional email delivery
- Mobile navigation, touch targets, scrolling, and overlays
- Social links and other public calls to action

## Trust and detail triage

Use this rule:

**Trust, confusion, or quality problem: fix now. Pure polish: backlog unless quick.**

Fix a detail immediately when it makes BYNV look broken, cheap, unfinished, robotic, or inconsistent; confuses the next action; interferes with conversion; weakens the Architect or Kai identity; or creates a privacy, security, billing, or entitlement concern.

Do not turn harmless preference differences into repeated redesign. Record non-blocking polish and return to higher-priority product work.

## Completion gate

Important work follows:

**Build → Test → Verify → Mark Complete**

Before marking an important item complete:

1. Test the intended happy path.
2. Test the most credible failure and recovery paths.
3. Verify the actual customer-visible result at the relevant desktop and mobile sizes.
4. Check for dead ends, misleading claims, broken actions, privacy leaks, and runtime errors.
5. Record what was verified, the environment used, and anything still blocked or unverified.

Use precise status language: implemented, build-verified, preview-verified, production-verified, or owner/device verification pending. Do not use “complete” or “ready” when a launch-critical journey remains unverified.

## Kai leadership standard

Kai combines **high expectations with good treatment**.

Kai should be competent, direct, warm, curious, encouraging, respectful, practical, and willing to challenge a mismatch between a member's stated priorities and actions. Kai challenges choices, assumptions, plans, and inconsistencies—not a member's worth or identity.

Kai must not become soft, patronizing, shaming, dependency-forming, inflated, or an aggressive “10X” motivational stereotype. Kai should distinguish known member context from inference, ask useful questions when context is missing, and end with a realistic next action when one is appropriate.

Existing privacy, safety, truthful-capability, and assessment safeguards remain binding. In particular, Kai may explain an assessment question but must never recommend an answer.

Urgent safety takes precedence over Kai's ordinary tone, challenge, coaching, assessment, and next-action behavior. When a message credibly signals imminent self-harm or harm to another person, do not continue the normal BYNV flow, recommend an assessment, or generate an AI handoff. Respond supportively, direct the person to immediate qualified or emergency help appropriate to the supported location, and avoid claiming that Kai is crisis support.

## Founder-content authenticity

AI may help edit, organize, format, and repurpose Daniel's supplied ideas. It must not invent Daniel's identity, voice, quotations, experiences, beliefs, results, setbacks, or lessons.

Founder-led content may cover:

- Why BYNV exists
- What Daniel is learning by using BYNV himself
- Lessons from building the product
- Becoming BYNV User #1
- What “Become Your Next Version” means in real life
- Genuine setbacks, corrections, and improvements

Every founder claim must be traceable to something Daniel actually supplied or approved. If authentic source material is missing, request it or publish non-founder educational content instead.

## User #1 evidence

Daniel's real use of BYNV is product evidence. Capture each meaningful finding as:

- Journey and step
- What Daniel expected
- What actually happened
- Trust, confusion, usability, conversion, or value impact
- Focused correction
- Retest result

Fix material friction. Do not overfit the product to a harmless personal preference that does not affect the wider customer experience.

## One high-value relationship per week

Recommend no more than one relationship or opportunity in a week. It must have a clear connection to BYNV through behavior change, AI implementation, community or subscription operations, distribution, partnerships, creator reach, product feedback, or a strategic introduction.

Each recommendation must identify the specific person or opportunity, why it matters now, and one intelligent next move. Do not recommend generic networking. If no qualified target is known, make no recommendation that week.

## Scope and launch control

These standards are filters for existing work, not a new workstream. Preserve approved architecture and avoid new systems unless a verified customer or operational need requires one.

The current social operating mode is **PRE-LAUNCH AWARENESS** as documented in [social-launch.md](./social-launch.md). Do not promote signup or billing, or deliberately direct new public acquisition traffic into those flows, until the owner gives the exact approval phrase documented there. This does not disable direct access needed for User #1 or approved testing. The approval authorizes the launch transition; it does not override unresolved safety, company-registration, legal, tax, Stripe, webhook, entitlement, Kai, or customer-journey readiness gates.
