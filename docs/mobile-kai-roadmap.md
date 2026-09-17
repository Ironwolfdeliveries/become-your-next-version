# BYNV utility roadmap: web first, efficient Kai, member independence

September 17, 2026. Proposed phases, not shipped native-app features or model changes.

## Product gate for every addition

Name which job the feature improves: understand, choose, act, stay accountable, adjust, see progress, or become more independent. Specify the saved context it reuses, the decision/action it produces, and how to tell whether it helped. If it mainly adds typing, reading, decoration, or dependency on Kai, do not build it.

The current pass adds a brief Reset that can lead into existing tools. Momentum already tracks actions, honest check-ins, recovery, Cycle/goal evidence, and milestones. Preserve that working loop rather than creating another parallel progress system.

## Next Version Reset: now and next

**Now:** Guided Kai asks an open direction question. Members can reuse their chosen Cycle/goal. The short path asks what change would matter and one next action. Optional depth explores repeated patterns, avoidance, expectations, and worries. Follow-up wording references the member's pattern or worry without inventing an explanation. The summary reproduces the member's words and can be edited before saving.

Saving is explicit: full summary to private Journal; direction and success signal to a new goal; one action to Today’s Plan. Existing commitments, reflections, check-ins, and the three-step limit are preserved. The goal links into existing Cycle creation; an active Cycle is reviewed, not replaced. Momentum shows the action through its normal completion/recovery flow. Challenges remain an optional destination; the Reset does not enroll anyone automatically.

No live model calls or new tables are needed. Answers remain in page memory until a chosen save. Raw Reset reflections are not automatically added to Live Kai context. The experience is reflection, not therapy, diagnosis, or crisis support; existing urgent-safety guidance interrupts the conversation when triggered.

**Next, only if member feedback warrants it:** offer a member-editable one-sentence “what matters to me” memory with purpose, source, timestamp, delete controls, and explicit reuse consent. Add a reminder only after a member chooses timing. Evaluate contextual follow-up quality before introducing Live-generated reflection questions. Never infer a condition, hidden motive, or diagnosis from a Reset answer. Do not score emotional disclosure or treat more writing as success.

A useful independence signal: can the member choose and adjust an action with less assistance over time? Fewer Kai turns can be a good result. Do not optimize for chat length.

## Mobile roadmap

| Phase | Scope | Evidence required before moving on |
| --- | --- | --- |
| 0: current web loop | Assessment → chosen direction → Cycle → action → recovery → evidence → next Cycle; responsive web | Fictional-profile tests plus real member reports that the next step is clear; preserve existing data |
| 1: improve phone use | Audit touch targets, keyboard/voice-dictation usability, saved-state recovery, accessibility, slow connections; consider installable web experience | Observe members returning on phones; fix their actual friction, then compare successful check-ins |
| 2: optional reminders | Opt-in push where supported, member timezone, quiet hours, frequency limits, easy pause; deep links to the exact action | Members request reminders; delivery and duplicate prevention are tested; a silent notification preview protects private goals |
| 3: native pilot only if justified | Fast Today’s Plan, Cycle/Momentum glance, deliberate voice journaling/Kai interaction, community notifications | A web limitation materially blocks an observed job; maintenance, privacy, platform requirements, and cost are budgeted |

Reuse Supabase identities, RLS, records, and server validation. Keep authorization and membership decisions on the server. A native client must not get service-role keys or a second entitlement database. Use platform-protected token storage and existing account deletion/revocation semantics. Test logout, expired sessions, another account on the same device, failed writes, duplicate retries, and timezone changes.

Voice should be optional and visible: ask before microphone access, show the transcript for correction, save only on member choice, and define deletion/retention before collecting audio. Do not introduce always-on listening. Community notifications should reveal no private journal, goal, or recovery text. Offline writes need idempotency and conflict review; never silently overwrite newer plans.

Do not schedule native development by a calendar date alone. Baseline real activation, seven-day useful return, recovery completion, and Cycle reviews first. Report small sample sizes honestly. The current pass does not ship push, offline queues, microphone capture, PWA installation, or native binaries.

## Kai architecture and cost

### Existing controls to retain

The repository already separates Guided Kai from entitled Live beta. Live uses the official OpenAI client, bounded recent history/context, input/output limits, moderation, rate and spend reservations, conservative usage settlement, and a kill switch. Saved member context is treated as untrusted reference information. Existing automatic context excludes private journal content and detailed recovery/review text. The Reset adds no live-token cost.

### Incremental options

| Option | Small next change when justified | Quality/security gate |
| --- | --- | --- |
| Structured context | Select fields by relevance and size before JSON serialization; include IDs, dates, status, current action, and concise chosen intention | Preserve valid structure and current state; distinguish user statements from instructions |
| Retrieval | Query the authenticated member's current Cycle and a few relevant records on demand | RLS/ownership on every query; no cross-member cache or shared personal-memory namespace |
| Stable prompt prefix / caching | Keep stable instructions and schemas separate from changing member context; benchmark the actual configured model and SDK | Verify model-specific cache support, retention, and breakpoints; no promised discount or cache hit |
| Routine model routing | Use deterministic Guided responses first; benchmark a lower-cost approved model for narrow routine tasks | Pass safety, relevance, privacy, and action-validity evaluations before enabling |
| Harder reasoning | Escalate only when the task needs it, within existing entitlement and budget controls | Server-selected allowlist, spend ceilings, no client-supplied arbitrary model |
| History compression | Create a bounded, source-linked summary of older chat only where useful | Keep uncertainty and corrections; discard stale summaries; member deletion propagates |

Do not build a vector database or agent swarm just for this pass. A small structured context can solve the immediate need. Do not change production model IDs or secrets on speculation. Use only official service credentials supplied through the existing secure environment.

Caching details are model-dependent. Current OpenAI documentation describes explicit/implicit modes and warns that a shared prefix does not necessarily produce a reusable cache entry; compaction may also reduce reuse. Recheck the selected model at implementation and compare total cost and answer quality rather than maximizing cache-hit rate alone. [OpenAI prompt caching documentation](https://developers.openai.com/api/docs/guides/prompt-caching).

### Evaluation before any Live expansion

Use synthetic directions across work, habits, organization, projects, and general growth. Include changed goals, stale plans, missed commitments, sensitive disclosures, prompt injection embedded in saved text, and budget exhaustion. Check: answer grounded in current records, no steering, no invented progress, safe recovery, correct tool authorization, and short actionable output. Measure input/output usage and latency by task without logging raw private answers.

Future Live actions must continue to require explicit member confirmation of the concrete proposed change. A conversational suggestion is not permission to replace a Cycle, complete a goal, contact someone, or change a reminder.

## Decisions still needing Daniel, when those phases begin

- Identify/confirm the existing BYNV YouTube and social handles and provide publishing access through their normal secure channels; do not send credentials in chat.
- Provide or authorize a narration voice and owned/licensed ambient source for the audio pilot; this pass provides the script and production brief.
- Grant Search Console access if channel/query reporting and index submission are to be performed; no verified BYNV property data was available here.
- Approve/enable a consented email campaign before any nurture is sent. Existing development/deployment authorization is already sufficient for the code pass.
- Explicitly reopen paid enrollment when the product is ready. It remains closed; no new approval is needed to keep developing within the current scope.
