import { describe, expect, it } from "vitest"
import { buildProjectRoadmap } from "./roadmap"
import {
  DEFAULT_SHARE_OPTIONS,
  approxMeasure,
  milestoneStatusLine,
  roadmapToMarkdown,
  roadmapToSvg,
  shareFileName,
  wrapText,
  type ShareInput,
} from "./roadmap-share"
import type { Project, Resource, Task } from "./types"

const today = new Date("2026-10-19T10:00:00")

const project = {
  id: "p",
  title: "DeutschOn <AI> & Co",
  objective: "Build the sustainable learning platform",
  weekStartISO: "2026-10-01",
  weekEndISO: "2026-12-15",
  color: "bg-chart-4",
  resourceIds: ["r1", "gone"],
  milestones: [
    { id: "m1", title: "Stripe billing live", dayIndex: 0, completed: true, completedAt: "2026-10-10", order: 1 },
    {
      id: "m2",
      title: "Update landing page",
      dayIndex: 0,
      completed: false,
      order: 2,
      targetDate: "2026-10-21",
      note: "Corrections from Inna applied",
      resourceIds: ["r1"],
    },
    { id: "m3", title: "Beta", dayIndex: 0, completed: false, order: 3, targetDate: "2026-10-10" },
  ],
} as unknown as Project

const tasks = [
  { id: "t1", title: "Fix hero copy", linkedProjectId: "p", milestoneId: "m2", completed: true },
  { id: "t2", title: "Swap screenshots", linkedProjectId: "p", milestoneId: "m2", completed: false, dueDate: "2026-10-20" },
  { id: "t3", title: "Loose task", linkedProjectId: "p", milestoneId: "", completed: false },
] as unknown as Task[]

const resources = [{ id: "r1", title: "DeutschOn site", category: "Build", tags: [], url: "https://deutschon.example" }] as unknown as Resource[]

function input(options = DEFAULT_SHARE_OPTIONS): ShareInput {
  return { project, roadmap: buildProjectRoadmap(project, tasks, today), resources, today, options }
}

describe("milestoneStatusLine", () => {
  it("describes done, upcoming and overdue milestones", () => {
    const [m1, m2, m3] = input().roadmap.milestones
    expect(milestoneStatusLine(m1, false)).toBe("Done Oct 10")
    expect(milestoneStatusLine(m2, true)).toBe("Target Oct 21 (in 2d) · Next · 1/2 tasks")
    expect(milestoneStatusLine(m3, false)).toBe("Target Oct 10 (9d late) · Overdue")
  })
})

describe("roadmapToMarkdown", () => {
  it("renders milestones, tasks, notes and live resources", () => {
    const md = roadmapToMarkdown(input())
    expect(md).toContain("# DeutschOn \\<AI\\> & Co — Roadmap")
    expect(md).toContain("**Progress:** 1/3 milestones · 1/3 tasks · 33%")
    expect(md).toContain("## 2. Update landing page")
    expect(md).toContain("_Target Oct 21 (in 2d) · Next · 1/2 tasks_")
    expect(md).toContain("- [x] Fix hero copy")
    expect(md).toContain("- [ ] Swap screenshots _(due Oct 20)_")
    expect(md).toContain("**Definition of done:** Corrections from Inna applied")
    expect(md).toContain("[DeutschOn site](https://deutschon.example)")
    expect(md).toContain("## Other tasks")
    expect(md).not.toContain("gone")
  })

  it("leaves out what the options exclude", () => {
    const md = roadmapToMarkdown(input({ includeTasks: false, includeNotes: false, includeResources: false }))
    expect(md).not.toContain("Fix hero copy")
    expect(md).not.toContain("Definition of done")
    expect(md).not.toContain("DeutschOn site")
    expect(md).not.toContain("Other tasks")
  })
})

describe("roadmapToSvg", () => {
  it("produces a well-formed, escaped SVG whose height grows with content", () => {
    const full = roadmapToSvg(input())
    const bare = roadmapToSvg(input({ includeTasks: false, includeNotes: false, includeResources: false }))
    expect(full.svg.startsWith("<svg")).toBe(true)
    expect(full.svg).toContain("DeutschOn &lt;AI&gt; &amp; Co")
    expect(full.svg).not.toContain("<AI>")
    expect(full.width).toBe(1080)
    expect(full.height).toBeGreaterThan(bare.height)
    expect(full.svg).toContain("Fix hero copy")
    expect(bare.svg).not.toContain("Fix hero copy")
  })
})

describe("wrapText", () => {
  it("wraps, hard-breaks long words and ellipsises past the line limit", () => {
    const lines = wrapText("one two three four five six seven", "400 20px x", 120, 2, approxMeasure)
    expect(lines).toHaveLength(2)
    expect(lines[1].endsWith("…")).toBe(true)
    const broken = wrapText("a".repeat(40), "400 20px x", 100, 5, approxMeasure)
    expect(broken.every((l) => approxMeasure(l, "400 20px x") <= 100)).toBe(true)
  })
})

describe("shareFileName", () => {
  it("slugs the title and dates the file", () => {
    expect(shareFileName({ title: "DeutschOn-AI: Launch!" }, today, "png")).toBe("deutschon-ai-launch-roadmap-2026-10-19.png")
    expect(shareFileName({ title: "???" }, today, "pdf")).toBe("project-roadmap-2026-10-19.pdf")
  })
})
