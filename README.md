# CC Orchestrator

[![CI](https://github.com/LLzijian/cc-orchestrator/actions/workflows/ci.yml/badge.svg)](https://github.com/LLzijian/cc-orchestrator/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)

**Keep Codex for the thinking; use your Claude Code provider for the bounded execution.**

CC Orchestrator lets Codex remain the planner and final owner while delegating simple, bounded leaf work to Claude Code. It is useful when the Codex allocation is better reserved for requirements, design, difficult debugging, and acceptance—while a Claude Code CLI configured with a compatible provider endpoint (for example, DeepSeek through your own Claude Code configuration) handles routine implementation and checks.

Every delegation produces a visible receipt, a tracked job, durable audit metadata, an explicit Claude session policy, and a required Codex verification handoff. The plugin does not bypass Codex limits or route credentials itself: provider selection, authentication, and billing remain entirely in the user's Claude Code configuration.

This project is derived from [sendbird/cc-plugin-codex](https://github.com/sendbird/cc-plugin-codex) and retains its robust Claude CLI, review isolation, job tracking, cancellation, and lifecycle hooks.

## Design

Codex owns:

- requirements, planning, architecture, and complex implementation;
- delegation boundaries and acceptance criteria;
- final diff inspection, verification commands, and acceptance.

Claude Code owns only the bounded task in its delegation contract. A Claude `completed` result remains pending until Codex records an independent acceptance or rejection.

The runtime preserves the model alias you select (such as `haiku`) and records Claude CLI's reported backing model in the audit result. This makes provider routing observable instead of silently assuming an Anthropic-hosted model.

## Main commands

| Command | Purpose |
| --- | --- |
| `$cc-orchestrator:delegate` | Delegate bounded leaf work with a task contract |
| `$cc-orchestrator:review` | Independent read-only review in a fresh Claude session |
| `$cc-orchestrator:adversarial-review` | Challenge design assumptions and tradeoffs |
| `$cc-orchestrator:status` | Inspect tracked work |
| `$cc-orchestrator:result` | Retrieve a finished result and verification state |
| `$cc-orchestrator:verify` | Record Codex acceptance or rejection with evidence |
| `$cc-orchestrator:sessions` | Inspect or reset task-chain session continuity |
| `$cc-orchestrator:cancel` | Cancel an active job |
| `$cc-orchestrator:setup` | Check Claude CLI, authentication, and hooks |

## Transparent delegation

Before Claude starts, the runtime emits a receipt like:

```text
[Claude Code delegation]
Job: task-a31f
Task chain: main/config-validation
Session: resume 7d82...
Session policy: auto
Model: haiku
Permission: workspace-write
Allowed files:
  - src/config.js
  - tests/config.test.js
```

The same metadata is written to a JSONL audit outside the source repository under the Codex plugin data directory.
The stored result also records Claude CLI's returned `modelUsage`, so provider aliases remain transparent—for example, a locally configured `haiku` alias may report a different actual backing model.

## Provider-neutral setup

CC Orchestrator calls the locally installed `claude` CLI; it does not embed an API key or choose a vendor. Configure Claude Code first with the provider and model aliases you are authorized to use. That can be Anthropic, a compatible self-hosted gateway, or a compatible third-party endpoint such as DeepSeek where your Claude Code setup supports it.

Then delegate using the alias from that configuration. The completion receipt and audit record expose the actual `modelUsage` reported by Claude Code, so Codex can verify what did the work.

## Task-chain sessions

`--session-policy auto` resumes the Claude session registered for the same task-chain and starts fresh when none exists. Use `fresh` for unrelated work or stale assumptions, and `resume` when absence of a matching session should be an error.

Sessions are scoped by repository state storage and task-chain name. This avoids one long, context-polluted Claude conversation while preserving useful continuity across implementation, test, and fix iterations for one feature.

## Direct runtime example

```powershell
node scripts/claude-companion.mjs delegate `
  --task-chain main/config-validation `
  --session-policy auto `
  --model haiku `
  --allowed-files src/config.js,tests/config.test.js `
  --acceptance "validation is implemented|existing API is unchanged" `
  --verification-commands "npm test -- tests/config.test.js" `
  "Implement the already-designed validation rule."
```

After inspecting the diff and running the checks, Codex records the handoff:

```powershell
node scripts/claude-companion.mjs verify task-a31f `
  --accept `
  --evidence "Diff stayed in scope; targeted tests passed."
```

## Local installation

Prerequisites:

- Node.js 18 or newer;
- Codex with native plugin hooks;
- Claude Code installed and authenticated.

Clone to the personal plugin location:

```powershell
git clone https://github.com/LLzijian/cc-orchestrator "$HOME/plugins/cc-orchestrator"
```

Add `cc-orchestrator` to the personal marketplace at `~/.agents/plugins/marketplace.json`, pointing to `./plugins/cc-orchestrator`, then install it in Codex as `cc-orchestrator@personal`. Run `$cc-orchestrator:setup` once and start a new Codex thread.

The development checkout is validated with:

```powershell
npm install
npm run test:cross-platform
npm run lint
npm run typecheck
```

## Security model

- Reviews use the upstream read-only review worktree and Git MCP isolation.
- Delegated writes use Claude Code's workspace sandbox.
- Explicit allowed-file contracts are checked again before Codex acceptance.
- Audit records must not contain secrets.
- Full-access delegation is intentionally not the default.

## Contributing and roadmap

Bug reports and focused contributions are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md). Near-term priorities are richer delegation receipts, reusable contract templates, and broader provider-configuration documentation. Please do not submit credentials, provider tokens, or private audit data in issues or pull requests.

## Attribution and license

Copyright 2026 Sendbird, Inc. and CC Orchestrator contributors.

Material is adapted from OpenAI's `codex-plugin-cc` through Sendbird's `cc-plugin-codex`. Licensed under Apache-2.0; see [LICENSE](LICENSE) and [NOTICE](NOTICE).
