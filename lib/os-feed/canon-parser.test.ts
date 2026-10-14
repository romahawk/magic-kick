import { describe, expect, it } from "vitest"
import { parseCurrentFocus, parseFrontMatterGenerated } from "./canon-parser"

// Same structure as AI-Business-OS `01_CONTEXT/current-focus.md` on 2026-10-14 (a5d9cfa), shortened.
const CURRENT_FOCUS = `---
id: current-focus
type: current-focus
status: active
review_cadence: weekly
reconciled_with_git: 2026-10-02
---

# Current Focus

> Reconciled against Git reality on 2026-10-02.

## Primary Outcomes

1. **Secure a strong AI, Technical PM, or product role** — active job search with credible positioning and proof-of-work.
2. **Ship the DeutschOn-AI Capstone MVP** — student submits, teacher reviews AI-assisted output, RLS enforced.
3. **Launch AlphaRhythm to a limited external beta** — real users, behavioural evidence.

FlowLogix Phase 0 is **no longer a primary outcome.** It was superseded as the capstone.

## Execution Allocation

Qualitative capacity signal per lane member — not a time budget.

\`\`\`yaml
execution_allocation:
  career: primary
  deutschon_ai: primary      # Master's capstone; degree deadline is the hard constraint
  alpharhythm: primary       # commercial lane, uncontested
  masters: protected         # non-capstone coursework
  magic_kick: primary        # infrastructure lane
  portfolio_react: limited   # career proof-of-work; serves outcome 1
  flowlogix: none            # dormant since 2026-03-24
\`\`\`

Magic Kick moved from \`limited\` to an active build on 2026-09-23.

## Full Project Portfolio (lane-based WIP model)

1. **Not an outcome** — numbered lines in later sections are ignored.

\`\`\`yaml
other: primary
\`\`\`
`

describe("parseCurrentFocus", () => {
  it("parses the real current-focus structure", () => {
    const focus = parseCurrentFocus(CURRENT_FOCUS)
    expect(focus.warnings).toEqual([])
    expect(focus.reconciledWithGit).toBe("2026-10-02")
    expect(focus.outcomes).toEqual([
      { id: "canon:outcome:1", title: "Secure a strong AI, Technical PM, or product role" },
      { id: "canon:outcome:2", title: "Ship the DeutschOn-AI Capstone MVP" },
      { id: "canon:outcome:3", title: "Launch AlphaRhythm to a limited external beta" },
    ])
    expect(focus.allocation).toHaveLength(7)
    expect(focus.allocation[0]).toEqual({ id: "canon:lane:career", lane: "career", level: "primary" })
  })

  it("strips trailing yaml comments", () => {
    const focus = parseCurrentFocus(CURRENT_FOCUS)
    expect(focus.allocation.map(({ lane, level }) => `${lane}=${level}`)).toEqual([
      "career=primary",
      "deutschon_ai=primary",
      "alpharhythm=primary",
      "masters=protected",
      "magic_kick=primary",
      "portfolio_react=limited",
      "flowlogix=none",
    ])
  })

  it("skips an unknown level with a warning", () => {
    const focus = parseCurrentFocus(CURRENT_FOCUS.replace("masters: protected", "masters: high"))
    expect(focus.allocation.map((lane) => lane.lane)).not.toContain("masters")
    expect(focus.warnings).toEqual(['Lane "masters": unknown level "high"; skipped.'])
  })

  it("keeps the outcomes when the allocation block is missing", () => {
    const withoutBlock = CURRENT_FOCUS.replace(/## Execution Allocation[\s\S]*?(?=## Full Project)/, "## Execution Allocation\n\nTBD\n\n")
    const focus = parseCurrentFocus(withoutBlock)
    expect(focus.outcomes).toHaveLength(3)
    expect(focus.allocation).toEqual([])
    expect(focus.warnings).toEqual(["Execution Allocation has no yaml block."])
  })

  it("keeps the allocation when the outcomes section is missing", () => {
    const focus = parseCurrentFocus(CURRENT_FOCUS.replace("## Primary Outcomes", "## Outcomes elsewhere"))
    expect(focus.outcomes).toEqual([])
    expect(focus.allocation).toHaveLength(7)
    expect(focus.warnings).toEqual(["No ## Primary Outcomes section."])
  })

  it("handles Windows line endings", () => {
    const focus = parseCurrentFocus(CURRENT_FOCUS.replace(/\n/g, "\r\n"))
    expect(focus.warnings).toEqual([])
    expect(focus.reconciledWithGit).toBe("2026-10-02")
    expect(focus.outcomes).toHaveLength(3)
    expect(focus.allocation).toHaveLength(7)
  })

  it("never throws on empty or unrelated content", () => {
    const focus = parseCurrentFocus("just text")
    expect(focus).toMatchObject({ reconciledWithGit: null, outcomes: [], allocation: [] })
    expect(focus.warnings).toHaveLength(3)
  })
})

describe("parseFrontMatterGenerated", () => {
  const PACK = `---
id: context-pack
type: generated-export
status: auto
generated: 2026-10-14 19:37 Europe/Berlin
content_hash: 36bd5cbf9a64
---

# AI-Business-OS — Context Pack

generated: not this one
`

  it("reads generated from the front matter", () => {
    expect(parseFrontMatterGenerated(PACK)).toBe("2026-10-14 19:37 Europe/Berlin")
    expect(parseFrontMatterGenerated(PACK.replace(/\n/g, "\r\n"))).toBe("2026-10-14 19:37 Europe/Berlin")
  })

  it("returns null without generated or without front matter", () => {
    expect(parseFrontMatterGenerated(PACK.replace("generated: 2026-10-14 19:37 Europe/Berlin\n", ""))).toBeNull()
    expect(parseFrontMatterGenerated("# No front matter\ngenerated: 2026-10-14\n")).toBeNull()
  })
})
