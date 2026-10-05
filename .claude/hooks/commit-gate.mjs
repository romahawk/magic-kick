// P8 commit gate (CONTROL_PLANE_UI_SPEC P8, ADR-023).
//
// PreToolUse hook for Bash / PowerShell calls that run `git commit`. Two checks, in this order:
//   1. The commit message has a "Verified:" and a "Not verified:" line (AGENTS.md,
//      "Commit, Push and PR Descriptions"). It checks that the lines exist, not that they are true.
//   2. npm run typecheck, lint and build all exit 0 (AGENTS.md, "Pre-Commit Gates").
// Exit 2 blocks the commit and sends stderr back to Claude; exit 0 lets it through.

import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { isAbsolute, resolve } from "node:path"

const GATES = ["typecheck", "lint", "build"]

function block(reason) {
  process.stderr.write(`Commit blocked by the P8 commit gate (.claude/hooks/commit-gate.mjs).\n${reason}\n`)
  process.exit(2)
}

let input
try {
  input = JSON.parse(readFileSync(0, "utf8"))
} catch {
  process.exit(0) // Not a hook payload; nothing to check.
}

const command = String(input?.tool_input?.command ?? "")
if (!/\bgit\s+(?:-\S+\s+)*commit\b/.test(command)) process.exit(0)

const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd()

// 1. Message lines. The message is in the command itself (-m, or -F - with a heredoc),
//    or in the file named by -F / --file.
if (!/--no-edit\b/.test(command)) {
  let message = command
  const fileArg = command.match(/(?:^|\s)(?:-F|--file)(?:\s+|=)("([^"]+)"|'([^']+)'|(\S+))/)
  const file = fileArg ? fileArg[2] ?? fileArg[3] ?? fileArg[4] : undefined
  if (file && file !== "-") {
    const path = isAbsolute(file) ? file : resolve(input.cwd || projectDir, file)
    try {
      message = readFileSync(path, "utf8")
    } catch {
      block(`Could not read the commit message file "${file}" to check it.`)
    }
  }
  // Case-sensitive: "Verified:" with a capital V is not the "verified:" inside "Not verified:".
  const missing = ["Verified:", "Not verified:"].filter((line) => !message.includes(line))
  if (missing.length > 0) {
    block(
      `The commit message is missing: ${missing.map((line) => `"${line}"`).join(" and ")}.\n` +
        "Add both lines (AGENTS.md, \"Commit, Push and PR Descriptions\"), then commit again."
    )
  }
}

// 2. Gates.
for (const gate of GATES) {
  const result = spawnSync("npm", ["run", gate], { cwd: projectDir, encoding: "utf8", shell: true })
  if (result.status !== 0) {
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim().split("\n").slice(-20).join("\n")
    block(`npm run ${gate} failed (exit ${result.status}). Fix it and commit again.\n\n${output}`)
  }
}

process.exit(0)
