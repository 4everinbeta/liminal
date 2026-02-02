---
description: Spec-driven GSD-style workflow powered by local Ollama models (no tool-calling required).
argument-hint: "<action> <phase> --model <ollama-model>"
---

This is the Ollama-friendly path when you don’t have a full tool runtime.

Run one of:

```bash
scripts/gsd-ollama discuss-phase <N> --model <model>
scripts/gsd-ollama plan-phase <N> --model <model>
scripts/gsd-ollama execute-phase <N> --model <model>
scripts/gsd-ollama verify-phase <N> --model <model>
```

Examples (your installed models):

```bash
scripts/gsd-ollama discuss-phase 2 --model qwen3-coder:latest
scripts/gsd-ollama execute-phase 2 --model qwen3-coder:latest
scripts/gsd-ollama verify-phase 2 --model glm-4.7-flash:latest
```

Troubleshooting:
- If execute-phase says “corrupt patch”, rerun it; it will auto-retry up to 3 times.
- A clean git working tree makes patch application much more reliable.
