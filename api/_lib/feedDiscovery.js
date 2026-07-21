import { fetchText, normalizeFeedUrl } from "./urlSecurity.js"
import { parseRssFeed } from "./rssParser.js"

const FEED_TYPES = ["application/rss+xml", "application/atom+xml", "application/xml", "text/xml"]
const CONVENTIONAL_PATHS = ["/feed", "/rss", "/rss.xml", "/atom.xml", "/feed.xml"]

export function isLikelyFeedContentType(value = "") {
  const contentType = String(value).toLowerCase()
  return FEED_TYPES.some((type) => contentType.includes(type))
}

export function discoverFeedFromHtml(html, pageUrl) {
  const links = []
  const linkPattern = /<link\b[^>]*>/gi
  const attributePattern = /([A-Za-z_:.-]+)\s*=\s*["']([^"']*)["']/g
  const page = new URL(pageUrl)
  let match

  while ((match = linkPattern.exec(String(html || "")))) {
    const attributes = {}
    let attributeMatch
    while ((attributeMatch = attributePattern.exec(match[0]))) {
      attributes[attributeMatch[1].toLowerCase()] = attributeMatch[2]
    }

    const rel = attributes.rel || ""
    const type = attributes.type || ""
    if (!rel.toLowerCase().split(/\s+/).includes("alternate")) continue
    if (!isLikelyFeedContentType(type)) continue
    if (!attributes.href) continue

    try {
      links.push({
        title: attributes.title || "",
        feedUrl: normalizeFeedUrl(new URL(attributes.href, page).toString())
      })
    } catch {
      // Ignore invalid alternate links and keep looking for usable feeds.
    }
  }

  return dedupeFeeds(links)
}

export async function discoverFeed(urlValue) {
  const url = normalizeFeedUrl(urlValue)
  const response = await fetchText(url)
  const contentType = response.headers?.["content-type"] || response.headers?.["Content-Type"] || ""

  if (isLikelyFeedContentType(contentType) || looksLikeFeed(response.text)) {
    const parsed = await parseRssFeed(response.text, response.url || url)
    return { feedUrl: parsed.feed.feedUrl, sourceUrl: response.url || url, parsed, candidates: [] }
  }

  const candidates = discoverFeedFromHtml(response.text, response.url || url)
  for (const candidate of candidates) {
    try {
      const feedResponse = await fetchText(candidate.feedUrl)
      const parsed = await parseRssFeed(feedResponse.text, feedResponse.url || candidate.feedUrl)
      return { feedUrl: parsed.feed.feedUrl, sourceUrl: response.url || url, parsed, candidates }
    } catch {
      // Try the next discovered candidate.
    }
  }

  for (const path of CONVENTIONAL_PATHS) {
    try {
      const fallbackUrl = new URL(path, url).toString()
      const feedResponse = await fetchText(fallbackUrl)
      const parsed = await parseRssFeed(feedResponse.text, feedResponse.url || fallbackUrl)
      return { feedUrl: parsed.feed.feedUrl, sourceUrl: response.url || url, parsed, candidates }
    } catch {
      // Conventional paths are opportunistic only.
    }
  }

  const error = new Error("No RSS or Atom feed was found at this address.")
  error.code = "FEED_NOT_FOUND"
  error.status = 404
  throw error
}

function looksLikeFeed(text) {
  return /<(rss|feed)\b/i.test(String(text || "").slice(0, 4096))
}

function dedupeFeeds(feeds) {
  const seen = new Set()
  return feeds.filter((feed) => {
    if (seen.has(feed.feedUrl)) return false
    seen.add(feed.feedUrl)
    return true
  })
}
