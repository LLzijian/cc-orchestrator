---
name: sessions
description: "Inspect or reset Claude Code task-chain sessions managed by CC Orchestrator. Use when the user asks whether Claude context will resume, wants to see session continuity, or wants to discard stale Claude context."
---

# Task-chain sessions

Resolve `<plugin-root>` as two directories above this `SKILL.md` file.

List sessions:

`node "<plugin-root>/scripts/claude-companion.mjs" sessions --json`

Reset one stale or unwanted chain:

`node "<plugin-root>/scripts/claude-companion.mjs" sessions --reset <task-chain> --json`

Explain that resetting the registry does not delete Claude's historical session data; it only prevents CC Orchestrator from automatically resuming that session for the named task-chain.
