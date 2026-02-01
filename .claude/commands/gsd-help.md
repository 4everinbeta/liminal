---
description: GSD quick help for this repo (Claude Code version).
---

This repo uses a GSD-style workflow with planning artifacts in `.planning/`.

Core files:
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/config.json`

Suggested flow per phase:
1. `/gsd-discuss-phase <N>` → produce `<N>-CONTEXT.md` (implementation decisions for phase N)
2. `/gsd-plan-phase <N>` → produce `<N>-PLAN.md` (checklist + file touch list)
3. Implement the plan
4. `/gsd-verify-work <N>` → verify against `<N>-PLAN.md` and phase requirements

If you get “Skill not found” errors, you’re likely trying to call an MCP skill registry. These commands are local markdown commands (no MCP required).

If you want a spec-driven flow that works well with local Ollama models, use:
- `scripts/gsd-ollama discuss-phase <N> --model <model>`
- `scripts/gsd-ollama plan-phase <N> --model <model>`
- `scripts/gsd-ollama verify-phase <N> --model <model>`
