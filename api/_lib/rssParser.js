import crypto from "node:crypto"
import Parser from "rss-parser"
import { sanitizeArticleHtml, toPlainExcerpt } from "./sanitizer.js"

const parser = new Parser({
  customFields: {
    item: [
      ["content:encoded", "contentEncoded"],
      ["media:content", "mediaContent"],
      ["media:thumbnail", "mediaThumbnail"]
    ]
  }
})

export async function parseRssFeed(xml, feedUrl, options = {}) {
  const maxItems = options.maxItems ?? 100
  const parsed = await parser.parseString(String(xml || ""))
  const siteUrl = normalizeOptionalUrl(parsed.link)

  const feed = {
    title: parsed.title || new URL(feedUrl).hostname,
    description: toPlainExcerpt(parsed.description || "", 240),
    feedUrl: normalizeOptionalUrl(feedUrl),
    siteUrl
  }

  const articles = (parsed.items || []).slice(0, maxItems).map((item) => normalizeArticle(item, siteUrl || feed.feedUrl))

  return { feed, articles }
}

function normalizeArticle(item, baseUrl) {
  const url = normalizeOptionalUrl(item.link || item.guid || baseUrl)
  const rawHtml = item.contentEncoded || item["content:encoded"] || item.content || item.contentSnippet || item.description || ""
  const contentHtml = sanitizeArticleHtml(rawHtml)
  const title = item.title || "Untitled story"

  return {
    guid: item.guid || stableUrlGuid(url || `${title}:${item.isoDate || item.pubDate || ""}`),
    title,
    url,
    author: item.creator || item.author || "",
    publishedAt: normalizeDate(item.isoDate || item.pubDate),
    excerpt: toPlainExcerpt(contentHtml || item.contentSnippet || item.description || "", 220),
    contentHtml,
    imageUrl: extractImageUrl(item, contentHtml),
    readingTimeMinutes: estimateReadingTime(contentHtml)
  }
}

function stableUrlGuid(value) {
  return `url:${crypto.createHash("sha256").update(String(value || "")).digest("hex")}`
}

function normalizeDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function normalizeOptionalUrl(value) {
  if (!value) return ""
  try {
    const url = new URL(value)
    if (!["http:", "https:"].includes(url.protocol)) return ""
    url.hash = ""
    return url.toString()
  } catch {
    return ""
  }
}

function estimateReadingTime(html) {
  const words = toPlainExcerpt(html, Number.MAX_SAFE_INTEGER).split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 220))
}

function extractImageUrl(item, html) {
  const candidates = [
    item.enclosure?.url,
    item.mediaContent?.$?.url,
    item.mediaThumbnail?.$?.url,
    html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]
  ].filter(Boolean)

  return normalizeOptionalUrl(candidates[0])
}
