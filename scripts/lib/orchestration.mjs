/**
 * Copyright 2026 Sendbird, Inc. and cc-orchestrator contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * Transparent delegation, task-chain sessions, and audit helpers.
 */

import fs from "node:fs";
import path from "node:path";

import { resolveStateDir } from "./state.mjs";

const SESSION_REGISTRY_FILE = "task-chains.json";
const AUDIT_FILE = "delegation-audit.jsonl";
const VALID_SESSION_POLICIES = new Set(["auto", "fresh", "resume"]);

function writeJsonAtomic(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(payload, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  fs.renameSync(tempPath, filePath);
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function registryPath(cwd) {
  return path.join(resolveStateDir(cwd), SESSION_REGISTRY_FILE);
}

function auditPath(cwd) {
  return path.join(resolveStateDir(cwd), AUDIT_FILE);
}

export function normalizeTaskChain(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/[^a-zA-Z0-9._/-]+/g, "-")
    .replace(/\/{2,}/g, "/")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
  return normalized || null;
}

export function normalizeSessionPolicy(value, hasTaskChain = false) {
  const normalized = String(value ?? (hasTaskChain ? "auto" : "fresh"))
    .trim()
    .toLowerCase();
  if (!VALID_SESSION_POLICIES.has(normalized)) {
    throw new Error(
      `Unsupported session policy "${value}". Use auto, fresh, or resume.`
    );
  }
  return normalized;
}

export function loadTaskChainRegistry(cwd) {
  const payload = readJson(registryPath(cwd), { version: 1, taskChains: {} });
  return {
    version: 1,
    taskChains:
      payload && typeof payload.taskChains === "object" && payload.taskChains
        ? payload.taskChains
        : {},
  };
}

export function resolveTaskChainSession(cwd, taskChain) {
  const key = normalizeTaskChain(taskChain);
  if (!key) return null;
  const entry = loadTaskChainRegistry(cwd).taskChains[key];
  if (!entry || typeof entry.sessionId !== "string" || !entry.sessionId.trim()) {
    return null;
  }
  return { taskChain: key, ...entry };
}

export function recordTaskChainSession(cwd, taskChain, sessionId, metadata = {}) {
  const key = normalizeTaskChain(taskChain);
  if (!key || !sessionId) return null;
  const registry = loadTaskChainRegistry(cwd);
  const entry = {
    sessionId,
    updatedAt: new Date().toISOString(),
    ...(metadata.jobId ? { lastJobId: metadata.jobId } : {}),
    ...(metadata.model ? { model: metadata.model } : {}),
  };
  registry.taskChains[key] = entry;
  writeJsonAtomic(registryPath(cwd), registry);
  return { taskChain: key, ...entry };
}

export function clearTaskChainSession(cwd, taskChain) {
  const key = normalizeTaskChain(taskChain);
  if (!key) return false;
  const registry = loadTaskChainRegistry(cwd);
  if (!Object.prototype.hasOwnProperty.call(registry.taskChains, key)) {
    return false;
  }
  delete registry.taskChains[key];
  writeJsonAtomic(registryPath(cwd), registry);
  return true;
}

export function appendDelegationAudit(cwd, event) {
  const filePath = auditPath(cwd);
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const record = {
    timestamp: new Date().toISOString(),
    ...event,
  };
  fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  return filePath;
}

export function readDelegationContract(cwd, filePath) {
  if (!filePath) return null;
  const absolutePath = path.resolve(cwd, filePath);
  const contract = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    throw new Error("Delegation contract must be a JSON object.");
  }
  const prompt = String(contract.prompt ?? contract.task ?? "").trim();
  const allowedFiles = Array.isArray(contract.allowedFiles)
    ? contract.allowedFiles.map(String).filter(Boolean)
    : [];
  const acceptance = Array.isArray(contract.acceptance)
    ? contract.acceptance.map(String).filter(Boolean)
    : [];
  const verificationCommands = Array.isArray(contract.verificationCommands)
    ? contract.verificationCommands.map(String).filter(Boolean)
    : [];
  return {
    ...contract,
    prompt,
    allowedFiles,
    acceptance,
    verificationCommands,
    sourcePath: absolutePath,
  };
}

export function buildDelegationReceipt({
  jobId,
  taskChain,
  sessionPolicy,
  resumeSessionId,
  model,
  effort,
  write,
  contract,
  summary,
}) {
  const lines = [
    "[Claude Code delegation]",
    `Job: ${jobId}`,
    `Task chain: ${taskChain ?? "(independent)"}`,
    `Session: ${resumeSessionId ? `resume ${resumeSessionId}` : "fresh"}`,
    `Session policy: ${sessionPolicy}`,
    `Model: ${model ?? "default"}${effort ? ` (${effort})` : ""}`,
    `Permission: ${write ? "workspace-write" : "read-only"}`,
    `Task: ${summary || contract?.prompt || "(see prompt)"}`,
  ];
  if (contract?.allowedFiles?.length) {
    lines.push("Allowed files:", ...contract.allowedFiles.map((item) => `  - ${item}`));
  }
  if (contract?.acceptance?.length) {
    lines.push("Acceptance:", ...contract.acceptance.map((item) => `  - ${item}`));
  }
  if (contract?.verificationCommands?.length) {
    lines.push(
      "Verification:",
      ...contract.verificationCommands.map((item) => `  - ${item}`)
    );
  }
  return `${lines.join("\n")}\n`;
}

function normalizeComparablePath(workspaceRoot, value) {
  const absolute = path.isAbsolute(value)
    ? path.resolve(value)
    : path.resolve(workspaceRoot, value);
  return path.relative(workspaceRoot, absolute).replace(/\\/g, "/");
}

export function findOutOfScopeFiles(workspaceRoot, allowedFiles, touchedFiles) {
  if (!Array.isArray(allowedFiles) || allowedFiles.length === 0) return [];
  const allowed = new Set(
    allowedFiles.map((item) => normalizeComparablePath(workspaceRoot, item))
  );
  return (touchedFiles ?? [])
    .map((item) => normalizeComparablePath(workspaceRoot, item))
    .filter((item) => !allowed.has(item));
}

export function resolveDelegationAuditPath(cwd) {
  return auditPath(cwd);
}
