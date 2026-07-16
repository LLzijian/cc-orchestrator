# Contributing

Thanks for improving CC Orchestrator.

## Before opening a pull request

1. Keep the change focused and explain the user-visible behavior.
2. Do not commit API keys, provider configuration, audit logs, or local task data.
3. Run `npm run test:cross-platform`, `npm run lint`, and `npm run typecheck`.
4. Add or update tests for behavior changes.

## Design boundaries

Codex owns planning, architecture, and acceptance. Claude Code is a bounded worker whose work remains pending until independent verification. Changes must preserve visible receipts, task-chain auditability, provider-neutral model aliases, and explicit write scope.

## Issues

Please include your OS, Codex version, Claude Code version, the provider/model alias (without credentials), expected behavior, and a redacted command output where relevant.
