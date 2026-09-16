# Plain-language guidance pass — September 16, 2026

This is a clarification pass on the shipped member experience, not a redesign.

## What changed

All seven assessment areas share a short everyday name, one-sentence meaning, practical examples, a small-action prompt, and a brief Kai explanation. The existing framework names and keys remain intact.

Environment & Systems now explains surroundings and routines: spaces, tools, calendars, reminders, clutter, paperwork, chores and repeat responsibilities. It explicitly distinguishes these from Relationships & Support, the area about people.

Today’s Plan and Architect Cycles show help beside the selected area. “What does this mean? Ask Kai” opens a short native disclosure on the same page. It does not open chat, call an AI API, write member data, or require another form. Examples stay collapsed until requested.

The same help appears in the assessment and saved-answer view, Blueprint, goals, orientation, dashboard and reassessment comparisons. Area-choice buttons explain their meaning before the member selects one.

New area-based recommendations use concrete actions. The Environment & Systems starting suggestion is: “Spend 10 minutes fixing one recurring source of friction in your space or routine.” Older Cycles without an area key are recognized only when their focus exactly matches a known area name. Custom priorities are not guessed from keywords.

## Preserved

- Current layout, 1–3 step limit, Edit/Replace, check-ins, recovery and Cycle behavior.
- Saved actions, notes, Cycle plans, Blueprint records, assessment questions, scores and area keys.
- Authentication, database, member access, Guided/Live cost controls and paid-enrollment hold.

No migration, member-data update, checkout change or paid AI call is part of this pass. Updated suggestions do not silently replace saved steps; the member still chooses whether to use a new suggestion.

## Verification

Run `npm test` and `npm run build`. The new 14-case test suite covers all seven areas, short copy, exact legacy-label recognition, unknown-key safety, saved-plan preservation, completed-action filtering and the three-step recommendation cap. Existing assessment-contract tests ensure all 42 questions and scoring inputs remain unchanged.

Isolated React/jsdom checks cover Today’s Plan and Cycle help for each of the seven areas, native disclosure opening, examples, zero help-related writes, a legacy Cycle without an area key, and score preservation. The existing seven component scenarios cover Cycle acceptance, orientation, check-ins, recovery and continued progress. These use mocked persistence/navigation and do not establish production visual layout or a signed-in User #1 walkthrough.

Deployment and live smoke-test results are recorded in the release pull request.
