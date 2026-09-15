import 'server-only';

export type LibraryContent = {
  intro: string;
  steps: { title: string; body: string; example?: string }[];
  takeaway: string;
  nextAction: string;
  nextHref?: string;
};

// Resolve this module only after the server has checked the member's library access.
// Keeping the full exercises here prevents premium material entering public client bundles.
const libraryContent: Record<string, LibraryContent> = {
  'ten-minute-focus-reset': {
    intro: 'Use this when everything seems urgent and you keep switching tasks. The aim is to leave with one action started. Give yourself ten minutes; a rough decision is enough.',
    steps: [
      {
        title: 'Minutes 1–2: Choose the pressure to reduce',
        body: 'Look at your current Cycle and Today’s Plan. Ask: which unfinished thing would make the rest of today easier if I moved it forward? Choose one. If two compete, choose the one with a real deadline or someone waiting for your response.',
        example: '“Send the missing delivery details” is more useful right now than “organize my entire inbox.”',
      },
      {
        title: 'Minutes 3–4: Name a visible finish line',
        body: 'Complete this sentence: “For this short session, done means…” Describe an action you can verify. Shrink it until the first part fits into the next six minutes.',
        example: '“Done means I have opened the quote, checked the delivery address, and drafted the two missing questions.”',
      },
      {
        title: 'Minutes 5–9: Make starting easier',
        body: 'Open the one item you need. Close or move aside one distraction. Start the smallest part immediately. If a new task occurs to you, leave yourself a brief reminder and return to the chosen action.',
      },
      {
        title: 'Minute 10: Mark what actually happened',
        body: 'Choose “Got it done,” “Made progress,” or “Didn’t happen” in Today’s Plan. If more remains, record the next visible step instead of rewriting the entire task. Decide whether to continue now or return at a realistic time.',
        example: '“Address checked. Next: send the two questions before lunch.”',
      },
    ],
    takeaway: 'A useful reset ends with evidence of movement and a clear next step.',
    nextAction: 'Choose one step in Today’s Plan',
    nextHref: '/daily-focus',
  },
  'smallest-useful-step': {
    intro: 'A goal can matter to you and still be too vague to start. This exercise turns the result you want into an action that is small enough for an ordinary day.',
    steps: [
      {
        title: 'Start with the goal you already chose',
        body: 'Open an existing goal or your active Cycle. Pick one result you want to move toward over the next two weeks. Reuse that wording instead of inventing a new goal.',
        example: '“I want my mornings to feel less rushed.”',
      },
      {
        title: 'Find the part you can do yourself',
        body: 'Separate the result from the behavior you control. Use a verb that someone could observe: prepare, place, send, open, call, draft, or practice.',
        example: '“Feel organized” becomes “Put tomorrow’s work items by the door tonight.”',
      },
      {
        title: 'Make a normal version and a smaller version',
        body: 'The normal version should fit the time you really have. The smaller version should still move the goal forward when the day changes. Neither version needs to prove how committed you are.',
        example: 'Normal: prepare my work bag and clothes. Smaller: put my keys and work badge together.',
      },
      {
        title: 'Give it a place in the day',
        body: 'Attach the action to an existing moment or a specific opening in your calendar. Add only the version you intend to do to Today’s Plan. Afterward, check in on what happened and adjust the size if needed.',
        example: '“After I clear dinner, I will put my keys and work badge by the door.”',
      },
    ],
    takeaway: 'The smallest useful step produces a real change you can build on tomorrow.',
    nextAction: 'Add your smallest useful step',
    nextHref: '/daily-focus',
  },
  'weekly-progress-review': {
    intro: 'Give this ten minutes at the end of a week. Start with the entries BYNV already holds. You only need enough reflection to make the coming week easier to act on.',
    steps: [
      {
        title: 'Look for evidence before judging the week',
        body: 'Open Progress and review completed actions, partial progress, and your active Cycle. Pick one concrete thing that moved. Include preparation or recovery if it helped you act.',
        example: '“I completed two planned actions and resumed on Thursday after missing Wednesday.”',
      },
      {
        title: 'Name the recurring obstacle',
        body: 'Look at missed or postponed actions. Was the main issue size, timing, missing information, or a priority that no longer fits? Choose the obstacle that appeared most often. Leave the others for another review.',
        example: '“I kept choosing evening tasks that needed more energy than I had after work.”',
      },
      {
        title: 'Choose one change to the plan',
        body: 'Keep a part that worked. Change one part that did not. A smaller action, earlier start, clearer finish line, or help from someone else can be enough.',
        example: '“Keep preparing the night before. Move the longer planning session to Saturday morning.”',
      },
      {
        title: 'Leave one next action ready',
        body: 'Choose the first useful action for the next day you intend to work on your goal. If a note would help, save two lines in Journal: “This week I learned…” and “Next week I will try…”',
      },
    ],
    takeaway: 'A review earns its place when it changes your next action.',
    nextAction: 'Review your progress',
    nextHref: '/progress',
  },
  'five-minute-arrival-script': {
    intro: 'This is a written focus exercise, not an audio recording. Read each section slowly and pause between them. Keep your eyes open or choose whatever feels comfortable. Use the final minute to begin a real action.',
    steps: [
      {
        title: 'Minute 1: Arrive',
        body: '“I am here. The whole day does not need to be solved in this moment. I can notice the surface in front of me, the room around me, and one thing I am ready to do.” Pause and let your breathing stay natural.',
      },
      {
        title: 'Minute 2: Choose',
        body: '“For these few minutes, my attention has one job.” Look at the priority in Today’s Plan. Choose one action. If it feels too large, choose its first visible part.',
        example: '“Open the document and write the first sentence.”',
      },
      {
        title: 'Minutes 3–4: Make room',
        body: '“Other thoughts can wait long enough for me to begin.” Move one distraction out of reach. Open what the action requires. If something important comes to mind, note a few words so you can return to it later.',
      },
      {
        title: 'Minute 5: Begin',
        body: '“I do not need to feel perfectly ready. I can take the next useful step.” Stop reading and spend the remaining minute on that step. When you finish the session, mark the progress you actually made.',
      },
    ],
    takeaway: 'Use the script as a short transition into action. It does not need to become another task to complete perfectly.',
    nextAction: 'Begin today’s next step',
    nextHref: '/daily-focus',
  },
  'confidence-evidence-bank': {
    intro: 'Confidence is easier to work with when you can point to something specific. Build a short collection of moments when you prepared, adapted, asked for help, or followed through. Small examples count.',
    steps: [
      {
        title: 'Find three real examples',
        body: 'Look at your recent actions, work, home responsibilities, or a previous challenge. Choose three moments when something you did helped. They do not need to be major wins.',
        example: '“I asked a question before guessing,” “I finished the difficult phone call,” and “I returned to my plan after a missed day.”',
      },
      {
        title: 'Separate your action from the outcome',
        body: 'For each example, write a short sentence about what you personally did. Results can involve luck and other people. Your action shows a behavior you can repeat.',
        example: 'Outcome: a customer replied. My action: I sent a clear follow-up with one specific question.',
      },
      {
        title: 'Name the repeatable strength',
        body: 'Choose ordinary words for the skill behind each action: preparation, patience, clear communication, persistence, or asking for help. Avoid broad claims you do not believe. Keep the evidence attached.',
        example: '“I can prepare for an uncomfortable conversation; I wrote my key points before the last one.”',
      },
      {
        title: 'Use one example for a small stretch',
        body: 'Choose one action you have been avoiding. Use a strength from your evidence bank to make the first attempt easier. Decide how you will prepare and what counts as trying, even if the outcome is outside your control.',
        example: '“Before asking about the new responsibility, I will write the two things I can contribute and one question about expectations.”',
      },
      {
        title: 'Save the evidence where you can reuse it',
        body: 'Keep the three examples in one Journal entry. Add a new example when a meaningful action happens. Read one before a difficult step; you do not need to reread the entire collection.',
      },
    ],
    takeaway: 'Useful confidence sounds like “I have handled part of this before, and here is how I can begin.”',
    nextAction: 'Save your evidence in Journal',
    nextHref: '/journal',
  },
  'career-opportunity-sprint': {
    intro: 'Use this to organize a job search, an internal opportunity, or a move toward more responsibility. The output is a focused two-week effort with reusable evidence of what you can contribute.',
    steps: [
      {
        title: 'Choose one kind of opportunity',
        body: 'Pick a role type or responsibility you want to explore. Identify two practical requirements that matter to you, such as schedule, location, or the work itself. Use them to narrow your search without pretending every future decision is settled.',
        example: '“Operations roles within a workable commute, with responsibility for scheduling and customer service.”',
      },
      {
        title: 'Build three evidence stories',
        body: 'For each story, note the situation, what you did, and what changed. Use accurate details. If you cannot verify a number, describe the change without inventing a statistic.',
        example: '“Orders were missing delivery details. I introduced a final address check. The team spent less time calling customers back for corrections.”',
      },
      {
        title: 'Choose a short opportunity list',
        body: 'Find up to five real openings, teams, or contacts to investigate. Record the next step for each: read requirements, tailor a résumé section, ask a question, or prepare an application. Verify current details at the original source.',
      },
      {
        title: 'Plan three actions for the next two weeks',
        body: 'Choose actions that fit your actual schedule. Separate preparation from submission so a large task does not hide several smaller ones. Keep a copy of what you send and the date.',
        example: '“Tuesday: update one résumé section. Thursday: tailor and submit one application. Saturday: prepare for a conversation about a second opportunity.”',
      },
      {
        title: 'Review effort and response separately',
        body: 'At the end of the sprint, count the useful actions you completed and note any responses. If responses are limited, review fit, clarity, and the next reasonable follow-up. Decide which approach to continue or change.',
      },
    ],
    takeaway: 'A career sprint leaves you with clearer direction, stronger examples, and a documented next step.',
    nextAction: 'Create a career goal',
    nextHref: '/goals',
  },
  'weekly-money-map': {
    intro: 'This exercise organizes information for the next two weeks. It does not recommend investments, credit products, or payment priorities. Use your own account records for amounts and dates; do not paste account numbers or login details into BYNV.',
    steps: [
      {
        title: 'Set a two-week window',
        body: 'Open your calendar and the records you normally use. List confirmed incoming amounts and expected outgoing amounts within that window. Mark estimates clearly and record where to verify uncertain figures.',
        example: '“Friday: pay deposit, amount to confirm. Monday: electricity due, amount shown on current bill.”',
      },
      {
        title: 'Make four simple columns',
        body: 'Use date, item, amount or estimate, and next step. Add only items in the chosen window. Keep sensitive account details in the secure tools where you already manage them.',
        example: '“September 18 | Phone bill | Verified statement amount | Check whether the scheduled payment is active.”',
      },
      {
        title: 'Separate known information from questions',
        body: 'Flag missing statements, unclear charges, and dates you need to confirm. Give each question a concrete information-gathering action. Do not treat a guessed amount as money available to spend.',
        example: '“Find the renewal email to confirm the subscription date and price.”',
      },
      {
        title: 'Choose one organizing action',
        body: 'Pick the item whose uncertainty is making the week hardest to understand. Find the relevant record, check the official account, or prepare the question you need to ask. If a decision requires professional help, keep a concise list of verified facts to bring.',
      },
      {
        title: 'Set your next review',
        body: 'Choose a realistic time next week to update the same map. Cross off verified or completed items, roll the window forward, and carry unanswered questions forward with a next step.',
      },
    ],
    takeaway: 'The useful result is a clearer view of dates and open questions so your next conversation or decision starts with accurate information.',
    nextAction: 'Add one money-organizing action',
    nextHref: '/daily-focus',
  },
  'realistic-energy-plan': {
    intro: 'This is a planning exercise for fitting ordinary tasks around your actual capacity. It does not diagnose fatigue or prescribe sleep, food, or exercise. Start with the schedule and energy patterns you already notice.',
    steps: [
      {
        title: 'Mark the demands that are already fixed',
        body: 'Look at work, travel, caregiving, appointments, and existing commitments for the next seven days. Notice which days already have little room. Planning starts with those facts.',
        example: '“Tuesday includes work, a longer commute, and an evening appointment. I should not place my biggest personal task there.”',
      },
      {
        title: 'Match the task to a realistic opening',
        body: 'Choose one important action from your Cycle. Ask whether it needs concentration, physical effort, a conversation, or simple administration. Place it in a time you can reasonably protect, based on your own experience.',
        example: '“The application needs concentration, so I will draft it Saturday morning. Confirming the appointment can fit into a short break.”',
      },
      {
        title: 'Prepare a smaller backup',
        body: 'Create a version that still moves the goal forward if the planned opening disappears. A useful backup can be preparation, one question, or the first few minutes of a task.',
        example: '“If I cannot draft the application, I will collect the three details needed to start it.”',
      },
      {
        title: 'Remove one avoidable source of friction',
        body: 'Prepare the materials, ask for a missing detail, or remove an unnecessary step ahead of time. Choose one practical change rather than adding a long new routine.',
        example: '“Put the appointment letter and my questions in the same folder the night before.”',
      },
      {
        title: 'Adjust after the day happens',
        body: 'Check in honestly on the action. If the plan repeatedly exceeds your available capacity, shrink or move it. If health concerns are affecting daily life, use this record to describe what you have noticed to a qualified clinician.',
      },
    ],
    takeaway: 'A realistic plan makes room for the day you are actually living.',
    nextAction: 'Adjust today’s action',
    nextHref: '/daily-focus',
  },
  'clear-conversation-plan': {
    intro: 'Use this for an ordinary conversation where you need to clarify expectations, ask for help, or address a recurring issue. Prepare a few short points and leave room to listen. If direct contact would feel unsafe, choose an appropriate source of support instead.',
    steps: [
      {
        title: 'Choose one observable issue',
        body: 'Describe what happened without guessing the other person’s motives. Keep the scope to one pattern or event that can be discussed clearly.',
        example: '“The last two schedule changes reached me after I had already left home.”',
      },
      {
        title: 'Explain the practical effect',
        body: 'Say what the issue changes for you or the shared work. Use a concrete effect rather than a list of everything that has gone wrong.',
        example: '“I could not adjust my travel plans, and we had to redo the pickup arrangement.”',
      },
      {
        title: 'Make a specific request',
        body: 'Ask for an action the other person can understand and respond to. Include the timing if it matters. Decide which part is essential and where you can be flexible.',
        example: '“Can we send confirmed schedule changes in the group chat as soon as we know, and ask for a quick acknowledgment?”',
      },
      {
        title: 'Prepare to hear their side',
        body: 'Ask an open question, pause, and check that you understood. You can acknowledge an explanation without agreeing with every part. If the conversation becomes unproductive, suggest a specific time to return to it.',
        example: '“What makes the updates difficult on your side?” Then: “It sounds like the final details are arriving late. Have I understood that?”',
      },
      {
        title: 'Close with one shared next step',
        body: 'Summarize the agreement in ordinary language: who will do what, and when you will check whether it helped. If there is no agreement, note the unresolved question and the next appropriate step.',
        example: '“We will try the group message for a week and check on Friday whether everyone is getting the changes in time.”',
      },
    ],
    takeaway: 'Preparation should make a conversation clearer while leaving enough room for another person’s perspective.',
    nextAction: 'Prepare one conversation in Journal',
    nextHref: '/journal',
  },
  'seven-day-follow-through': {
    intro: 'This seven-day practice uses one small action each day. Allow about fifteen minutes to set it up, then a few minutes per day for your chosen action and check-in. Start from an existing goal so the challenge supports something you already care about.',
    steps: [
      {
        title: 'Before Day 1: Choose one repeatable action',
        body: 'Select an action small enough for an ordinary busy day and define its finish line. Choose a constructive recovery rule: if you miss it, explain the blocker, shrink the next step, or choose a new time. Keep the rule optional and useful.',
        example: '“Spend five minutes preparing tomorrow’s first work task. If I miss it, do a two-minute version the next day.”',
      },
      {
        title: 'Days 1–2: Practice starting',
        body: 'Attach the action to a familiar moment. Do the chosen version, then check in. Resist adding extra requirements because the first day feels easy. You are checking whether the action fits your real routine.',
      },
      {
        title: 'Days 3–4: Remove the main obstacle',
        body: 'Review the first two days. Change one thing that made starting hard: the time, location, materials, or action size. Keep a part that helped. Record progress even when the action is only partly completed.',
        example: '“Evenings were unpredictable. I will prepare the task before I leave work, with the document already open.”',
      },
      {
        title: 'Days 5–6: Practice recovery',
        body: 'If a day was missed, use the recovery rule and continue with today’s action. Do not double the workload to make up for it. If no day was missed, keep the same realistic action and note what is making it work.',
      },
      {
        title: 'Day 7: Decide what earns a place next week',
        body: 'Look at what you actually did and whether it helped your goal. Choose to continue, resize, or replace the action. Save one sentence about the condition that made follow-through easiest.',
        example: '“I followed through most often when the step was already chosen before the day began.”',
      },
    ],
    takeaway: 'The challenge succeeds when you learn how to act and recover in a way you can repeat.',
    nextAction: 'Set your first daily action',
    nextHref: '/daily-focus',
  },
  'kai-planning-prompt-pack': {
    intro: 'Use one prompt when you reach the matching decision. Kai’s available context and responses depend on the active Guided or Live mode. Check any proposed plan against your real schedule. If you use another AI tool, provide only the context it needs and remove private identifiers.',
    steps: [
      {
        title: 'Prompt 1: Choose a priority',
        body: '“Help me choose one priority for my next 14 days. Use the Blueprint and active goals you can actually see. Tell me which facts you are using and what you do not know. Offer at most three options with a practical reason for each. Ask one question only if a missing answer would change the recommendation. Let me choose before building a plan.”',
        example: 'Useful addition only if needed: “My evenings are full this week, but I can protect twenty minutes on Saturday.”',
      },
      {
        title: 'Prompt 2: Test a proposed plan',
        body: '“Review this plan for fit with my available time: [paste a plan only if it is not already visible]. Identify the first action, any dependency, and the most likely obstacle. Propose no more than three realistic steps for the next 14 days. Give each a visible finish line and a smaller backup. Do not add new goals. Let me accept or edit the proposal.”',
        example: 'A useful finish line: “Three résumé examples drafted” instead of “Become more employable.”',
      },
      {
        title: 'Prompt 3: Recover after a missed action',
        body: '“My last planned action did not happen. Use my saved action and check-in if available. Help me identify whether the obstacle was size, timing, missing information, or changed priorities. Offer a choice to keep it, shrink it, move it, or replace the approach. Suggest one useful next step. Do not add punishment or a catch-up workload.”',
        example: 'A specific blocker helps: “The call needed a document I could not find.”',
      },
      {
        title: 'Prompt 4: Review a Cycle with evidence',
        body: '“Help me review my current Architect Cycle. Separate completed actions, partial progress, and outcomes I have actually confirmed. Compare them with the starting goal. Do not invent score improvements, streaks, or results. Identify one approach worth keeping and one change to test. Offer two next-Cycle directions and let me choose.”',
        example: 'If Kai cannot access an outcome, supply the missing fact: “The meeting happened; we agreed to test the new schedule for a week.”',
      },
      {
        title: 'Check the answer before saving the action',
        body: 'Look for a realistic size, a visible finish line, and facts you recognize. Correct assumptions. Accept only the steps you intend to do. A conversation proposal becomes your commitment when you choose and save it in the relevant plan or Cycle.',
      },
    ],
    takeaway: 'A good planning prompt narrows a decision, makes assumptions visible, and ends with an action you can choose.',
    nextAction: 'Use a prompt with Kai',
    nextHref: '/kai',
  },
  'cycle-review-and-renewal': {
    intro: 'Use this at the end of a 14-day Cycle or when a Cycle no longer fits. It combines a short evidence review with a practical plan for what comes next. Reuse your saved actions and goals; only add the context they do not capture.',
    steps: [
      {
        title: 'Part 1: Put the starting point beside today',
        body: 'Open your Cycle and Progress. Complete this short comparison using known facts: “At the start, I wanted ___. Since then, I completed ___. I can now see ___.” Separate effort from outcomes and label anything you still need to confirm.',
        example: '“I wanted a less rushed morning. I prepared the night before on six days. On four of those mornings I left at the time I planned.”',
      },
      {
        title: 'Part 2: Identify what made the difference',
        body: 'Choose one useful action, one condition that helped, and one obstacle that repeated. Avoid listing every detail. Decide which piece you can reasonably change.',
        example: 'Useful action: preparing the bag. Helpful condition: doing it after dinner. Obstacle: leaving the needed papers at work.',
      },
      {
        title: 'Part 3: Choose continue, deepen, or redirect',
        body: 'Continue if the goal still matters and the approach needs more time. Deepen if the basic action fits and a modest next step would help. Redirect if your priorities or circumstances changed. Choose based on usefulness, not pressure to make every Cycle harder.',
        example: '“Continue preparing the night before, and add one reminder to collect the papers before leaving work.”',
      },
      {
        title: 'Part 4: Draft the next Cycle in five lines',
        body: 'Use these five lines: “My priority is ___. Meaningful progress in 14 days would look like ___. My first 1–3 steps are ___. On a difficult day, the smaller version is ___. If I miss an action, my optional recovery rule is ___.” Keep each line short enough to read at a glance.',
        example: '“Priority: calmer mornings. Progress: leave at my chosen time on more workdays. Steps: collect papers, prepare the bag, choose clothes. Smaller version: keys and badge ready. Recovery: name the blocker and prepare one item.”',
      },
      {
        title: 'Part 5: Close the old Cycle and choose the first action',
        body: 'Review your Cycle’s saved status and record the outcome honestly. A completed review does not mean every goal was achieved. Create or update the next Cycle when ready, then place its first realistic step in Today’s Plan. Reassess when a fresh assessment would be useful; do not substitute an assumed score for a completed assessment.',
      },
    ],
    takeaway: 'The next version of your plan should reflect what your last Cycle taught you.',
    nextAction: 'Review your Architect Cycle',
    nextHref: '/architect-cycle',
  },
};

export function getLibraryContent(slug: string): LibraryContent | undefined {
  return Object.prototype.hasOwnProperty.call(libraryContent, slug)
    ? libraryContent[slug]
    : undefined;
}
