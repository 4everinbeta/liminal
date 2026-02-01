---
description: Create an actionable implementation plan for phase `<N>`; write `<N>-PLAN.md`.
---

Create a concrete plan for Phase `$ARGUMENTS` and write it to `$ARGUMENTS-PLAN.md`.

Read:
- `.planning/ROADMAP.md` (phase scope)
- `.planning/STATE.md` (current reality)
- `$ARGUMENTS-CONTEXT.md` (required; if missing, instruct user to run `/gsd-discuss-phase $ARGUMENTS` first)

Output requirements for `$ARGUMENTS-PLAN.md`:
- Goal + non-goals (1–3 bullets each)
- Deliverables checklist with acceptance criteria
- File-by-file change list (expected touched files/dirs)
- Test/verification steps (specific commands or manual checks)
- Risks/unknowns + how to resolve

End by asking the user if you should start executing the plan.

