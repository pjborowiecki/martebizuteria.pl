import { spawnSync } from "node:child_process"
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const GROUPS: Record<string, string> = {
  "antfu/skills": "antfu",
  "cloudflare/skills": "cloudflare",
  "greensock/gsap-skills": "gsap",
  "medusajs/medusa-agent-skills": "medusa",
  "resend/resend-skills": "resend",
  "stripe/ai": "stripe",
  "tanstack-skills/tanstack-skills": "tanstack",
}

const agentsDirectory = resolve(".agents/skills")
const claudeDirectory = resolve(".claude/skills")
const lock: { skills: Record<string, { source: string; skillPath?: string }> } = JSON.parse(readFileSync("skills-lock.json", "utf8"))
const local = process.argv.includes("--local")
const entries = Object.entries(lock.skills).map(([name, entry]) => {
  const group = GROUPS[entry.source]
  if (group === undefined) throw new Error(`Add a vendor group for ${entry.source} before syncing ${name}.`)
  const plugin = /^plugins\/([^/]+)\//.exec(entry.skillPath ?? "")?.[1]
  return { group: plugin === undefined ? group : join(group, plugin.replace(`${group}-`, "")), name }
})
const staging = mkdtempSync(join(tmpdir(), "marte-skills-"))

try {
  if (!local) {
    copyFileSync("skills-lock.json", join(staging, "skills-lock.json"))
    const result = spawnSync(process.execPath, ["x", "--bun", "skills", "experimental_install"], {
      cwd: staging,
      stdio: "inherit",
    })
    if (result.status !== 0) throw new Error("Skill restore failed; the existing installation has been preserved.")
  }

  // Build and validate the complete replacement before touching installed skills.
  const grouped = join(staging, "grouped")
  for (const { name, group } of entries) {
    const flat = join(local ? agentsDirectory : join(staging, ".agents/skills"), name)
    const source = local && !existsSync(join(flat, "SKILL.md")) ? join(agentsDirectory, group, name) : flat
    if (!existsSync(join(source, "SKILL.md"))) throw new Error(`Missing ${name}; the existing installation has been preserved.`)
    cpSync(source, join(grouped, group, name), { recursive: true })
  }

  rmSync(agentsDirectory, { force: true, recursive: true })
  cpSync(grouped, agentsDirectory, { recursive: true })
  rmSync(claudeDirectory, { force: true, recursive: true })
  mkdirSync(claudeDirectory, { recursive: true })
  const roots = [...new Set(entries.map(({ group }) => group.split("/")[0] ?? group))].sort()
  for (const root of roots) {
    symlinkSync(`../../.agents/skills/${root}`, join(claudeDirectory, root))
  }
  console.log(`Synced ${entries.length} skills into ${roots.join(", ")}; linked .claude/skills.`)
} finally {
  rmSync(staging, { force: true, recursive: true })
}
