import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, describe, expect, it } from "vite-plus/test"

const COMMIT_EMOJIS = [
  ["build", "🛠️"],
  ["chore", "♻️"],
  ["ci", "⚙️"],
  ["docs", "📚"],
  ["feat", "✨"],
  ["fix", "🐛"],
  ["perf", "🚀"],
  ["refactor", "📦"],
  ["revert", "🗑️"],
  ["style", "💎"],
  ["test", "🚨"],
] as const

const GIT_GENERATED_SUBJECTS = [
  "Merge branch 'main'",
  'Revert "fix(cart): keep the basket"',
  "fixup! fix(cart): keep the basket",
  "squash! fix(cart): keep the basket",
]

const directory = mkdtempSync(join(tmpdir(), "commit-msg-"))
let messageCount = 0

afterAll(() => {
  rmSync(directory, { force: true, recursive: true })
})

const runHook = (message: string, source?: string) => {
  messageCount += 1
  const messageFile = join(directory, `COMMIT_EDITMSG_${messageCount}`)
  writeFileSync(messageFile, message)
  const result = spawnSync("bun", ["scripts/commit-msg.ts", messageFile, ...(source === undefined ? [] : [source])], { encoding: "utf8" })

  return { message: readFileSync(messageFile, "utf8"), status: result.status, stderr: result.stderr }
}

describe("prepare-commit-msg hook", () => {
  it.each(COMMIT_EMOJIS)("prefixes a %s subject with %s", (type, emoji) => {
    expect(runHook(`${type}(scope): describe the change\n`, "message")).toStrictEqual({
      message: `${emoji} ${type}(scope): describe the change\n`,
      status: 0,
      stderr: "",
    })
  })

  it.each(COMMIT_EMOJIS)("keeps an amended %s subject that already starts with %s", (type, emoji) => {
    expect(runHook(`${emoji} ${type}(scope): describe the change\n\nWhy it changed.\n`, "commit")).toStrictEqual({
      message: `${emoji} ${type}(scope): describe the change\n\nWhy it changed.\n`,
      status: 0,
      stderr: "",
    })
  })

  it("replaces the emoji of another type with the one for the subject's type", () => {
    expect(runHook("🐛 feat(cart): keep the basket\n", "commit").message).toBe("✨ feat(cart): keep the basket\n")
  })

  it("rejects a subject that starts with an emoji the hook does not add", () => {
    const result = runHook("🔥 wip\n", "message")

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("Commit message does not follow conventional format.")
    expect(result.message).toBe("🔥 wip\n")
  })

  it("rejects a conventional subject with an unknown type", () => {
    const result = runHook("feature(cart): keep the basket\n", "message")

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Unknown commit type: "feature"')
    expect(result.message).toBe("feature(cart): keep the basket\n")
  })

  it.each(["squash", "merge", "template"])("leaves a %s message to Git", (source) => {
    expect(runHook("anything at all\n", source)).toStrictEqual({ message: "anything at all\n", status: 0, stderr: "" })
  })

  it.each(GIT_GENERATED_SUBJECTS)("leaves the Git subject %s unchanged", (subject) => {
    expect(runHook(`${subject}\n`, "message")).toStrictEqual({ message: `${subject}\n`, status: 0, stderr: "" })
  })

  it("prefixes the first line that is not a comment and keeps the rest of the message", () => {
    const message = "\n# Please enter the commit message\nfix(cart): keep the basket  \n\nWhy it changed.\n# Changes to be committed:"

    expect(runHook(message, "message").message).toBe(
      "\n# Please enter the commit message\n🐛 fix(cart): keep the basket\n\nWhy it changed.\n# Changes to be committed:\n",
    )
  })

  it("leaves a message without a subject line unchanged", () => {
    expect(runHook("\n# Please enter the commit message\n", "message")).toStrictEqual({
      message: "\n# Please enter the commit message\n",
      status: 0,
      stderr: "",
    })
  })
})
