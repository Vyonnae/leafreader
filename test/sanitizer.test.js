import { describe, expect, test } from "vitest"
import { sanitizeArticleHtml, toPlainExcerpt } from "../api/_lib/sanitizer.js"

describe("sanitizeArticleHtml", () => {
  test("removes scripts, event handlers, iframes, and unsafe URLs", () => {
    const html = '<p onclick="evil()">Hello <script>alert(1)</script><iframe src="https://evil.test"></iframe><a href="javascript:alert(1)">bad</a><img src="data:text/html,nope" onerror="evil()"></p>'

    const cleaned = sanitizeArticleHtml(html)

    expect(cleaned).toContain("<p>Hello")
    expect(cleaned).not.toContain("script")
    expect(cleaned).not.toContain("iframe")
    expect(cleaned).not.toContain("onclick")
    expect(cleaned).not.toContain("javascript:")
    expect(cleaned).not.toContain("onerror")
  })

  test("keeps safe links and enforces noopener noreferrer", () => {
    const cleaned = sanitizeArticleHtml('<a href="https://example.com/story">Story</a>')

    expect(cleaned).toContain('href="https://example.com/story"')
    expect(cleaned).toContain('rel="noopener noreferrer"')
  })
})

describe("toPlainExcerpt", () => {
  test("returns compact plain text capped to the requested length", () => {
    expect(toPlainExcerpt("<p>Hello&nbsp;world from LeafReader</p>", 11)).toBe("Hello world")
  })
})
