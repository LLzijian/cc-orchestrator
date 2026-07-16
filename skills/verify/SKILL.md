---
name: verify
description: "Verify and accept or reject a completed CC Orchestrator task. Use after a Claude Code delegate finishes, never as a substitute for inspecting the diff and running the task contract checks."
---

# Verify a delegated task

Resolve `<plugin-root>` as two directories above this `SKILL.md` file.

Before accepting a job:

1. Open its result with `node "<plugin-root>/scripts/claude-companion.mjs" result <job-id> --json`.
2. Inspect the actual repository diff and touched files.
3. Run every verification command in the stored contract.
4. Apply the nearest `AGENTS.md` rules and any domain-specific acceptance requirements.
5. Accept with:

   `node "<plugin-root>/scripts/claude-companion.mjs" verify <job-id> --accept --evidence <concise-evidence>`

6. Reject with:

   `node "<plugin-root>/scripts/claude-companion.mjs" verify <job-id> --reject --evidence <failure-evidence>`

The companion refuses acceptance when recorded touched files exceed an explicit allowed-file contract.
