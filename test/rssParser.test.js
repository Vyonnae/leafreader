import { describe, expect, test } from "vitest"
import { parseRssFeed } from "../api/_lib/rssParser.js"

const rss = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Example RSS</title>
    <link>https://example.com</link>
    <description>RSS description</description>
    <item>
      <title>First item</title>
      <link>https://example.com/a?utm_source=x</link>
      <guid>guid-1</guid>
      <pubDate>Tue, 21 Jul 2026 08:00:00 GMT</pubDate>
      <description><![CDATA[<p>Hello <strong>RSS</strong><script>bad()</script></p>]]></description>
    </item>
  </channel>
</rss>`

const atom = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Example Atom</title>
  <link href="https://example.org"/>
  <entry>
    <title>Atom item</title>
    <link href="https://example.org/post"/>
    <updated>2026-07-21T08:00:00Z</updated>
    <content type="html">&lt;p&gt;Atom content&lt;/p&gt;</content>
  </entry>
</feed>`

describe("parseRssFeed", () => {
  test("normalizes RSS metadata and sanitizes article content", async () => {
    const result = await parseRssFeed(rss, "https://example.com/feed.xml")

    expect(result.feed.title).toBe("Example RSS")
    expect(result.feed.siteUrl).toBe("https://example.com/")
    expect(result.articles).toHaveLength(1)
    expect(result.articles[0]).toMatchObject({
      title: "First item",
      guid: "guid-1",
      url: "https://example.com/a?utm_source=x"
    })
    expect(result.articles[0].contentHtml).not.toContain("<script>")
    expect(result.articles[0].readingTimeMinutes).toBeGreaterThanOrEqual(1)
  })

  test("parses Atom entries and creates a stable URL-derived GUID fallback", async () => {
    const result = await parseRssFeed(atom, "https://example.org/feed")

    expect(result.feed.title).toBe("Example Atom")
    expect(result.articles[0].title).toBe("Atom item")
    expect(result.articles[0].guid).toMatch(/^url:/)
  })

  test("limits returned articles", async () => {
    const items = Array.from({ length: 105 }, (_, index) => `<item><title>${index}</title><link>https://example.com/${index}</link></item>`).join("")
    const result = await parseRssFeed(`<?xml version="1.0"?><rss version="2.0"><channel><title>Many</title>${items}</channel></rss>`, "https://example.com/rss")

    expect(result.articles).toHaveLength(100)
  })
})
