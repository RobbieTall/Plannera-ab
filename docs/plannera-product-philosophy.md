# Plannera Product Philosophy

Plannera exists because property development has become too hard to understand before someone is already financially, emotionally, or legally committed.

The person standing at the beginning of a project is often forced to make major decisions with incomplete information. They might be looking at a block of land, a renovation, a secondary dwelling, a small subdivision, a dual occupancy, or a larger opportunity. Before they even know whether the idea is realistic, they are confronted by layers of planning instruments, DCP controls, SEPP pathways, overlays, council mapping systems, consultant opinions, project risk, hidden cost, and uncertain process.

The current system rewards insiders. It rewards the person who already knows which clause matters, which map to check, which consultant to call, which pathway is realistic, and which early warning signs will later turn into delay, redesign, refusal, or wasted money. That is not because planning professionals are doing something wrong. It is because the planning system itself is fragmented, technical, and unforgiving. The information technically exists, but it is not arranged around the decision the user needs to make.

Plannera believes that planning knowledge should not remain trapped inside documents, portals, PDFs, web maps, consultant reports, and professional memory. It should be converted into clear, cited, project-specific intelligence that helps a person understand what they are dealing with, what is likely possible, what is risky, what needs expert verification, and what steps should come next.

Plannera does not exist to replace judgement. It exists to reduce blind spots.

It is not pretending that AI can remove the need for planners, certifiers, architects, engineers, bushfire consultants, flood consultants, councils, or legal advice in complex matters. The opposite is true. Plannera should make it clearer when those people are needed, why they are needed, and what question they need to answer. Its role is to make early-stage property and planning decisions dramatically clearer, faster, and more defensible before the user spends serious money.

Plannera stands against vague AI. It stands against generic chatbots that produce confident-sounding planning advice without showing sources. It stands against expensive early-stage uncertainty. It stands against hidden consultant knowledge being the only path to clarity. It stands against generic project management tools that organise tasks but do not understand planning. It stands against users being forced to choose between doing nothing, paying too much too early, or gambling on incomplete information.

The product philosophy is therefore simple:

**Plannera turns planning complexity into project intelligence.**

That phrase matters. It is not merely “answering planning questions”. It is not merely “generating documents”. It is not merely “project management”. It is the conversion of messy, dispersed planning and development information into a structured project brain: one that can guide a user from first site question, through feasibility, through documentation, through approval, and eventually through the broader development lifecycle.

The first expression of this philosophy is focused and practical:

1. **Quick Site Check** gives the user immediate clarity.
2. **SEE Builder** turns that clarity into a professional planning document.
3. **Basic Feasibility** connects planning reality to development viability.
4. **Project Workspace** keeps the intelligence, documents, assumptions, sources, and outputs together.

That sequence is the right wedge. It begins with the user’s first question: “What can I do here?” It then moves to the thing they are willing to pay for: “Help me prepare the document.” Then it moves into the more valuable strategic layer: “Should I proceed, redesign, delay, or walk away?”

The deeper product belief is this: property development should not begin with confusion. It should begin with orientation.

Plannera should feel like the calm, intelligent planning strategist sitting beside the user, not making promises it cannot guarantee, but constantly separating what is known, what is likely, what is uncertain, and what needs verification. That distinction becomes the moral centre of the product. When Plannera knows, it says so and cites the source. When it is making a planning judgement, it labels it. When something needs professional review, it says that plainly. When something is too complex for automated confidence, it escalates the issue rather than faking certainty.

The long-term vision can be global, but the product must earn that future locally. NSW is the proving ground. The product should not prematurely claim to understand every planning system. It should first become excellent at a small number of LGAs and development types. From there, it should expand by repeatable intelligence packs: statutory instruments, spatial layers, DCP controls, SEPP pathways, local controls, hazard datasets, document templates, and golden test cases.

The engineering philosophy must match the product philosophy. Plannera cannot be built as “AI over documents” and hope for the best. That is the trap. Full LEP/DCP ingestion and parsing is still the correct long-term architecture, but the early product should not be blocked by perfect statewide parsing. The better strategy is a staged intelligence model:

**Stage 1: Project Search Intelligence**
For early LGAs and early users, Plannera can perform targeted search and retrieval across key clauses, mapped sources, known DCP sections, user-uploaded documents, and curated planning references. This gets product value into users’ hands before the perfect machine-readable planning universe exists.

**Stage 2: Structured Clause Intelligence**
As each LGA matures, Plannera should convert recurring high-value controls into structured, tested, reusable data: zone objectives, land-use permissibility, height, FSR, minimum lot size, setbacks, parking, landscaping, private open space, hazards, referral triggers, and development-type-specific requirements.

**Stage 3: Regional Planning Intelligence Pack**
Once a region reaches a threshold of reliable ingestion, parsing, mapping, golden tests, and user validation, it becomes a “trusted pack”. This is the point where Plannera can confidently run deterministic checks and generate more automated documents.

**Stage 4: Full Planning Landscape Understanding**
Only after enough structured controls, citations, spatial overlays, DCP extracts, SEPP pathways, and local exceptions are working should Plannera behave like it understands the complete planning landscape for that LGA.

That staged approach is the 0.1% engineering answer: **do not wait for perfect ingestion to launch value, but never let partial ingestion pretend to be complete intelligence.**

Plannera should always know what level of confidence it is operating at.

That becomes one of the most important product concepts:

**Confidence state.**

Every answer, check, artefact, and recommendation should sit somewhere on a confidence ladder:

1. **Verified** — sourced from parsed clause/rule data and tested.
2. **Cited** — grounded in retrieved statutory or DCP text.
3. **Inferred** — reasoned from available planning context but requiring review.
4. **User-provided** — based on information supplied by the user.
5. **Unresolved** — cannot be determined from current data.

This gives Plannera integrity. It lets the product launch earlier without becoming reckless. It also creates a pathway for the engineering team: every LGA, rule, and feature should move more information from “inferred” to “cited” to “verified” over time.

Plannera’s philosophy is not speed at the expense of truth. It is speed with traceability. It is empowerment with caution. It is project management with statutory intelligence. It is professional-grade support without pretending to be a substitute for professional responsibility.

# 2. Core User Insight

The core user is not simply “a homeowner”, “a planner”, or “a developer”.

The core user is a person trying to make a property decision before they have enough clarity to feel safe making it.

They may be a small developer looking at a site. They may be a planner preparing a report. They may be a building designer checking pathway risk. They may be a property owner wondering whether a secondary dwelling, cabin, pool, shed, renovation, dual occupancy, or subdivision is possible. They may be a consultant who already knows planning but wants to work faster. They may be a developer who wants early feasibility without engaging a full consultant team too soon.

What unites them is not their title. It is the moment they are in.

They are between idea and commitment.

They have not yet spent all the money, but they may soon. They have enough interest to act, but not enough certainty to proceed confidently.

The current gap is this:

**They work in fragments, but they want to work from a project brain.**

Plannera’s user does not want a chatbot. They want a guide with structure.

Plannera should therefore be designed around this promise:

**Plannera helps you get clear enough to act, and honest enough to know what still needs checking.**

# 3. Product Principles

## Principle 1: Show the source before asking for trust

Every meaningful planning answer should reveal where it came from: LEP clause, DCP section, SEPP provision, spatial overlay, uploaded source, project note, or user-provided assumption.

## Principle 2: Separate confirmed, likely, and unknown

Every important output should fit one of these states:

- **Confirmed** — direct source or structured rule supports it.
- **Likely** — strong planning indication, but requires verification.
- **Needs input** — user must provide more information.
- **Needs expert review** — complexity exceeds safe automated guidance.
- **Unavailable** — data source not yet reliable for this location or topic.

## Principle 3: Build the project brain, not just the answer box

Plannera should never become another one-off AI chat window.

## Principle 4: Start narrow, make it excellent, then scale through packs

Each LGA should move through stages:

1. **Unserved** — no reliable data.
2. **Search-supported** — key documents and clauses can be searched and cited.
3. **Clause-supported** — high-value LEP/DCP sections are reliably retrievable.
4. **Rule-supported** — selected controls are structured and testable.
5. **Pack-supported** — tested intelligence pack with golden cases.
6. **Automation-ready** — deterministic checks and high-confidence document generation.

## Principle 5: The user should always know the next best action

Every major output should answer:

- What does this mean?
- Why does it matter?
- What should I do next?
- What must be verified?
- What document, consultant, or decision is needed?

## Principle 6: Professional enough for consultants, clear enough for owners

The user should feel: “This is serious enough to trust, but clear enough that I can use it.”

## Principle 7: Every feature must increase planning confidence or project momentum

The product should grow from the core loop:

**site → intelligence → decision → artefact → next action → project progress**

# 4. The Standard

Plannera is exceptional when a property owner, planner, consultant, or developer can enter a site, describe a proposal, upload relevant project material, and within minutes receive a clear, cited, confidence-labelled understanding of what is possible, what is risky, what pathway is likely, what documents are needed, and what to do next.

# 5. Voice and Tone Guide

Plannera speaks like a calm development strategist with planning intelligence.

Language rules:

1. Plain English first, technical detail second.
2. Avoid false certainty.
3. Use professional caution without fear-mongering.
4. Be useful, not merely accurate.
5. Separate planning fact from strategic judgement.
6. Never hide behind disclaimers.
7. Respect the user’s intelligence.

# 6. The Naming and Character Layer

Use:

- **Plannera** as the platform.
- **Era** as the intelligence layer.

Era is Plannera’s calm, strategic, source-aware advisor.

# 7. The Pitch Kernel

Plannera is an AI planning and development assistant for property owners, planners, consultants, and small developers who need to understand what can be done with a site, what risks matter, what documents are needed, and how to move a project towards approval. It turns planning controls, site constraints, uploaded documents, project notes, and generated reports into one organised project workspace, starting with fast site checks, professional SEE drafting, and early feasibility guidance. It wins because it does not behave like a generic chatbot: it is built around real planning sources, project memory, clear next steps, and honest confidence levels, helping users get clear before they spend serious money.


## 8. Delivery Pattern for New LGAs

Plannera should use a Just-in-Time LGA Activation pattern for unsupported councils: provide immediate LEP/state baseline context, trigger background preparation of local DCP and mapping sources, then update project intelligence once local controls are ready. This keeps first responses fast while preserving confidence integrity.

See: `docs/architecture/just-in-time-lga-activation.md`.

Project memory index: `docs/project-memory/README.md`.
