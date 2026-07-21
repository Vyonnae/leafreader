import { describe, expect, test } from "vitest"
import { discoverFeedFromHtml, isLikelyFeedContentType } from "../api/_lib/feedDiscovery.js"

describe("discoverFeedFromHtml", () => {
  test("finds RSS and Atom alternate links relative to the page URL", () => {
    const html = `<html><head>
      <link rel="alternate" type="application/rss+xml" title="RSS" href="/rss.xml">
      <link rel="alternate" type="application/atom+xml" title="Atom" href="https://example.com/atom.xml">
    </head></html>`

    expect(discoverFeedFromHtml(html, "https://example.com/news").map((feed) => feed.feedUrl)).toEqual([
      "https://example.com/rss.xml",
      "https://example.com/atom.xml"
    ])
  })
})

describe("isLikelyFeedContentType", () => {
  test("accepts feed XML content types and rejects plain HTML", () => {
    expect(isLikelyFeedContentType("application/rss+xml; charset=utf-8")).toBe(true)
    expect(isLikelyFeedContentType("application/atom+xml")).toBe(true)
    expect(isLikelyFeedContentType("text/html")).toBe(false)
  })
})
