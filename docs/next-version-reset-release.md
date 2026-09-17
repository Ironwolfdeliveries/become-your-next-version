# Next Version Reset and useful entry paths

September 17, 2026.

## Implemented

- Protected `/next-version-reset`: original Guided Kai conversation with a short path and optional deeper reflection, reuse of a chosen Cycle/goal, contextual follow-up, editable summary, and explicit save decisions.
- Private Journal save, minimal new-goal save, and safe append to Today’s Plan. Stable IDs make retries safe. Existing daily priorities, notes, steps, Cycle links and check-ins are preserved; full or checked-in days require review in the existing tool.
- Links from Dashboard, Momentum and Kai. Saved goals hand off to existing Cycle creation; current Cycles are never replaced by the Reset. Existing Momentum completion and recovery behavior remains authoritative.
- Three distinct free guides at `/start`: feeling stuck, repeatedly starting over, and finishing a project. Useful exercises precede the free Version Snapshot CTA. Metadata, canonical URLs, Article markup, related links and sitemap entries are included.
- No schema migration, paid-launch change, new Live model call, external publication, or email campaign.

## Prepared for next phase

- `docs/organic-growth-plan.md`: search-intent cluster, four-week $0-media plan, three short scripts, four consent-dependent email drafts, and measurement definitions.
- `docs/audio-video-pilot.md`: original long-form narration script, production brief, rights/quality requirements and distinct future concepts. No rendered audio/video is claimed.
- `docs/mobile-kai-roadmap.md`: evidence-gated mobile phases, member-independence criteria, and incremental context/caching/retrieval/model-routing options.

## Verification

Local lint, types, existing safeguards and production build pass. New pure tests cover legacy data preservation, three-step/check-in guards, retry deduplication, bounded input and distinct guide destinations. Real React/jsdom tests cover five self-chosen directions, optional depth, contextual wording, explicit saving, retry identity and urgent-safety interruption. Actual API-handler tests cover authentication, same-origin checks, validation, private responses, minimal payloads and conflicting retries. Network and database calls are mocked in component/API tests.

The existing 13 member-interaction scenarios, all seven area-guidance checks and isolated PostgreSQL preservation/accountability suites also pass. No production member records were edited during testing. Production preservation and release checks are recorded in the deployment report.

Authenticated browser review requires a member session; automated component and database checks do not claim to replace it. The Reset deliberately keeps unsaved answers only in page memory; they are lost when leaving. After a save attempt the summary is fixed to keep retries unambiguous; a different direction starts a new Reset.

## Rollback

Revert this application commit or promote the previous verified deployment. No database rollback or data deletion is needed. Any member-created Journal entries, goals or daily actions remain valid in the previous application because they use existing records and contracts.
