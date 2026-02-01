---
description: Run a local Ollama model for a subtask (WSL2-friendly).
argument-hint: "<model> -- <prompt>  (or: -- <prompt> to use $OLLAMA_MODEL)"
---

Use Ollama as a helper model for a focused subtask, then paste the result back into this chat.

Rules:
- Keep the prompt narrowly scoped (one task).
- Ask for outputs that are easy to apply (diffs, file lists, bullet steps).
- Never request secrets.

If `$ARGUMENTS` includes a model, run:

```bash
ollama run <model> -- '<prompt>'
```

If `$ARGUMENTS` starts with `--`, pick the model from `$OLLAMA_MODEL`:

```bash
ollama run "${OLLAMA_MODEL:?Set OLLAMA_MODEL or pass a model name}" -- '<prompt>'
```

If you don’t know the model name, list them:

```bash
ollama list
```

Now do it:
1) Parse `$ARGUMENTS` as either:
   - `<model> -- <prompt>` (preferred), OR
   - `-- <prompt>` (uses `$OLLAMA_MODEL`)
2) Execute the corresponding `ollama run ...` command via the bash tool.
3) Summarize the Ollama output in 5–10 bullets and propose next steps in this repo.

