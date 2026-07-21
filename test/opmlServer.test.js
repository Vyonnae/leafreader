import { describe, expect, test } from "vitest"
import { buildOpmlDocument, summarizeImportResults } from "../api/_lib/opml.js"

describe("buildOpmlDocument", () => {
  test("groups subscriptions by collection and XML-escapes fields", () => {
    const xml = buildOpmlDocument([
      {
        title: 'A & B "Feed"',
        feedUrl: "https://example.com/rss?x=1&y=2",
        siteUrl: "https://example.com/?q=a&b=c",
        collectionName: "Tech & Design"
      }
    ])

    expect(xml).toContain('<outline text="Tech &amp; Design"')
    expect(xml).toContain('text="A &amp; B &quot;Feed&quot;"')
    expect(xml).toContain('xmlUrl="https://example.com/rss?x=1&amp;y=2"')
    expect(xml).not.toContain("user_id")
  })
})

describe("summarizeImportResults", () => {
  test("counts imported skipped and failed feed results", () => {
    expect(summarizeImportResults([
      { status: "imported" },
      { status: "skipped" },
      { status: "failed" }
    ])).toEqual({ imported: 1, skipped: 1, failed: 1 })
  })
})
