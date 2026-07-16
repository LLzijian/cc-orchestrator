---
name: delegate
description: "Delegate a simple, bounded leaf implementation or repetitive execution task to Claude Code after Codex has planned it. Use proactively for low-reasoning coding, focused tests, mechanical refactors, formatting, or routine command execution. Keep architecture, ambiguous requirements, high-risk changes, and final verification in Codex."
---

# Transparent Claude Code delegation

Use this skill only after Codex has reduced the work to a bounded leaf task.
Codex remains the owner of planning, integration, scientific or architectural judgment, and final acceptance.

Do not delegate when the task is ambiguous, cross-cutting, destructive, security-sensitive, scientifically interpretive, or likely to overlap with active Codex edits. Never run concurrent write delegates against overlapping files.

Resolve `<plugin-root>` as two directories above this `SKILL.md` file. Use only:

`node "<plugin-root>/scripts/claude-companion.mjs" ...`

## Required workflow

1. State in commentary that Claude Code will be invoked and give the bounded task, intended model, write scope, and whether the task-chain is expected to resume or start fresh.
2. Choose a stable task-chain identifier such as `<branch>/<feature>` or `<module>/<objective>`. Reuse it only for genuine follow-ups in the same implementation chain.
3. Reserve a tracked job id:

   `node "<plugin-root>/scripts/claude-companion.mjs" task-reserve-job --json`

4. Run the delegate in the foreground by default. Use `--background` only when the user explicitly asks or the bounded command is expected to run long.

   `node "<plugin-root>/scripts/claude-companion.mjs" delegate --job-id <job-id> --task-chain <task-chain> --session-policy auto --model <model> --allowed-files <comma-separated-files> --acceptance <pipe-separated-criteria> --verification-commands <pipe-separated-commands> <task>`

5. Select `haiku` for mechanical work and small focused edits. Select `sonnet --effort low` or `sonnet --effort medium` for ordinary local implementation. Do not delegate work that needs Opus-level reasoning; Codex should own it.
6. After Claude exits, inspect the stored result:

   `node "<plugin-root>/scripts/claude-companion.mjs" result <job-id> --json`

7. Independently inspect the real diff, confirm the touched-file boundary, run the contract verification commands, and apply all applicable `AGENTS.md` rules. Claude reporting success is not evidence that the task is complete.
8. Mark the result accepted only after successful Codex verification:

   `node "<plugin-root>/scripts/claude-companion.mjs" verify <job-id> --accept --evidence <concise-evidence>`

   If verification fails, use `--reject` with evidence. Then either resume the same task-chain with a precise corrective delta or let Codex take over.
9. Tell the user what Claude changed and what Codex independently verified. Always include the job id and whether the Claude session was fresh or resumed.

## Contract rules

- Prefer an explicit allowed-file list. If discovery is necessary, delegate a read-only investigation first and let Codex define the later write scope.
- Acceptance criteria must be observable.
- Verification commands must be exact and runnable from the workspace.
- Never include secrets in the prompt, contract, or audit metadata.
- Use `--session-policy fresh` for unrelated work, a changed branch, stale assumptions, or a failed direction that should not be continued.
- Use `--session-policy resume` only when continuation is mandatory and absence of a matching task-chain session should fail rather than silently start over.

The companion prints a delegation receipt before Claude starts and stores durable audit records outside the repository source tree.
