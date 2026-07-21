// @vitest-environment jsdom
import { describe, expect, test } from "vitest"
import { parseOpmlFile } from "../src/utils/opml.js"

describe("parseOpmlFile", () => {
  test("walks nested folders, deduplicates feed URLs, and keeps safe fields only", () => {
    const result = parseOpmlFile(`<?xml version="1.0"?>
      <opml version="2.0"><body>
        <outline text="Tech">
          <outline text="Example" xmlUrl="https://example.com/rss" htmlUrl="https://example.com"/>
          <outline text="Duplicate" xmlUrl="https://example.com/rss"/>
        </outline>
        <outline text="News"><outline text="Daily" xmlUrl="http://news.example/feed"/></outline>
      </body></opml>`)

    expect(result.errors).toEqual([])
    expect(result.feeds).toEqual([
      { title: "Example", feedUrl: "https://example.com/rss", siteUrl: "https://example.com/", collectionName: "Tech" },
      { title: "Daily", feedUrl: "http://news.example/feed", siteUrl: "", collectionName: "News" }
    ])
  })

  test("rejects entity declarations and limits feed count", () => {
    expect(parseOpmlFile('<!DOCTYPE opml [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><opml/>').errors[0].code).toBe("UNSAFE_XML")

    const outlines = Array.from({ length: 101 }, (_, index) => `<outline text="${index}" xmlUrl="https://example.com/${index}.xml"/>`).join("")
    const result = parseOpmlFile(`<opml><body>${outlines}</body></opml>`, { maxFeeds: 100 })

    expect(result.feeds).toHaveLength(100)
    expect(result.errors.some((error) => error.code === "TOO_MANY_FEEDS")).toBe(true)
  })
})
