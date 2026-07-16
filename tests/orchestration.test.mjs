import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildDelegationReceipt,
  clearTaskChainSession,
  findOutOfScopeFiles,
  loadTaskChainRegistry,
  normalizeSessionPolicy,
  normalizeTaskChain,
  readDelegationContract,
  recordTaskChainSession,
  resolveTaskChainSession,
} from "../scripts/lib/orchestration.mjs";

function withTempCodexHome(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cc-orchestrator-test-"));
  const previous = process.env.CODEX_HOME;
  process.env.CODEX_HOME = path.join(root, ".codex");
  const workspace = path.join(root, "workspace");
  fs.mkdirSync(workspace, { recursive: true });
  try {
    return fn({ root, workspace });
  } finally {
    if (previous === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previous;
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("normalizes task chains and session policies", () => {
  assert.equal(normalizeTaskChain(" main\\config validation "), "main/config-validation");
  assert.equal(normalizeSessionPolicy(undefined, true), "auto");
  assert.equal(normalizeSessionPolicy(undefined, false), "fresh");
  assert.throws(() => normalizeSessionPolicy("forever"), /Unsupported session policy/);
});

test("records, resolves, lists, and clears task-chain sessions", () =>
  withTempCodexHome(({ workspace }) => {
    recordTaskChainSession(workspace, "main/config", "claude-session-1", {
      jobId: "task-1",
      model: "haiku",
    });
    const resolved = resolveTaskChainSession(workspace, "main/config");
    assert.equal(resolved.sessionId, "claude-session-1");
    assert.equal(resolved.lastJobId, "task-1");
    assert.equal(loadTaskChainRegistry(workspace).taskChains["main/config"].model, "haiku");
    assert.equal(clearTaskChainSession(workspace, "main/config"), true);
    assert.equal(resolveTaskChainSession(workspace, "main/config"), null);
  }));

test("loads a normalized JSON delegation contract", () =>
  withTempCodexHome(({ workspace }) => {
    const file = path.join(workspace, "contract.json");
    fs.writeFileSync(
      file,
      JSON.stringify({
        task: "Update the parser",
        allowedFiles: ["src/parser.js"],
        acceptance: ["tests pass"],
        verificationCommands: ["npm test"],
      })
    );
    const contract = readDelegationContract(workspace, file);
    assert.equal(contract.prompt, "Update the parser");
    assert.deepEqual(contract.allowedFiles, ["src/parser.js"]);
  }));

test("renders an auditable delegation receipt", () => {
  const receipt = buildDelegationReceipt({
    jobId: "task-1",
    taskChain: "main/config",
    sessionPolicy: "auto",
    resumeSessionId: "session-1",
    model: "haiku",
    write: true,
    contract: { allowedFiles: ["a.js"], acceptance: ["tests pass"] },
    summary: "Update config",
  });
  assert.match(receipt, /Job: task-1/);
  assert.match(receipt, /Session: resume session-1/);
  assert.match(receipt, /Allowed files:\n {2}- a\.js/);
});

test("detects touched files outside an explicit contract", () => {
  const workspace = path.resolve("C:/workspace");
  assert.deepEqual(
    findOutOfScopeFiles(workspace, ["src/a.js"], ["src/a.js", "src/b.js"]),
    ["src/b.js"]
  );
});
