import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8")

describe("responsive layout contract", () => {
  it("protects the root and shrinkable layout children from horizontal overflow", () => {
    expect(css).toMatch(/html,\s*body,\s*#app\s*{[^}]*overflow-x:\s*clip/s)
    expect(css).toMatch(
      /\.library,\s*\.catalog-panel,\s*\.article-list,\s*\.story-card,\s*\.reader,\s*\.reader-bar,\s*\.reader-scroll,\s*\.reading-page\s*{[^}]*min-width:\s*0/s,
    )
  })

  it("uses only the approved shell breakpoints and state-driven tracks", () => {
    expect(css).toContain("@media (min-width: 1200px)")
    expect(css).toContain("@media (min-width: 901px) and (max-width: 1199px)")
    expect(css).toContain("@media (max-width: 900px)")
    expect(css).toMatch(
      /\.app-shell\.is-reading\s*{[^}]*grid-template-columns:[^}]*clamp\([^}]*minmax\(0,\s*1fr\)/s,
    )
    expect(css).not.toContain("@media (max-width: 1120px)")
  })

  it("replaces the feed with the reader on compact screens and auto-fits cards", () => {
    expect(css).toMatch(
      /@media \(max-width: 1199px\)[\s\S]*?\.app-shell\.is-reading \.library\s*{[^}]*display:\s*none/s,
    )
    expect(css).toMatch(/\.article-list\.grid\s*{[^}]*repeat\(auto-fit,\s*minmax\(/s)
  })
})
