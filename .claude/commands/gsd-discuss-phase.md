---
description: Gather phase context through adaptive questioning; write `<phase>-CONTEXT.md`.
---

You are running inside a repo that follows a GSD-style planning workflow.

Goal: extract the *implementation decisions* downstream work needs for Phase `$ARGUMENTS` and write them to `$ARGUMENTS-CONTEXT.md`.

Read first:
- `.planning/STATE.md`
- `.planning/ROADMAP.md`
- If present, `$ARGUMENTS-CONTEXT.md` (offer update/view/skip)

Process:
1. Validate the phase number exists in `.planning/ROADMAP.md` (error if missing).
2. Analyze the phase goal and list 3–5 phase-specific “gray areas” (UX, data shape, error cases, edge behavior, migration, rollout).
3. Ask the user to pick which gray areas to discuss (multi-select; no “skip all”).
4. For each selected area: ask 4 concrete questions, then ask if they want more questions on that area or move on.
5. Write `$ARGUMENTS-CONTEXT.md` with sections matching the discussed areas, capturing decisions and constraints (not vague goals).
6. End by suggesting `/gsd-plan-phase $ARGUMENTS`.

Guardrails:
- Do not expand scope beyond the phase boundary in `.planning/ROADMAP.md`. Capture new ideas under “Deferred”.
- Do not dive into deep architecture; focus on decisions that unblock implementation and testing.

