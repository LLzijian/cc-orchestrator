import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COMPANION = path.join(ROOT, "scripts", "claude-companion.mjs");

function runCompanion(args, env) {
  return spawnSync(process.execPath, [COMPANION, ...args], {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

test("sessions command returns the task-chain registry and audit path", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cc-orchestrator-cli-"));
  const workspace = path.join(root, "workspace");
  fs.mkdirSync(workspace, { recursive: true });
  try {
    spawnSync("git", ["init", "-q", workspace], { encoding: "utf8" });
    const result = runCompanion(
      ["sessions", "--cwd", workspace, "--json"],
      { CODEX_HOME: path.join(root, ".codex") }
    );
    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.deepEqual(payload.taskChains, {});
    assert.match(payload.auditFile, /delegation-audit\.jsonl$/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
