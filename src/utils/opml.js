const DEFAULT_MAX_BYTES = 1024 * 1024
const DEFAULT_MAX_FEEDS = 100

export function parseOpmlFile(text, options = {}) {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES
  const maxFeeds = options.maxFeeds ?? DEFAULT_MAX_FEEDS
  const raw = String(text || "")
  const errors = []

  if (new Blob([raw]).size > maxBytes) {
    return { feeds: [], errors: [{ code: "FILE_TOO_LARGE", message: "OPML file is too large." }] }
  }

  if (/<!DOCTYPE|<!ENTITY/i.test(raw)) {
    return { feeds: [], errors: [{ code: "UNSAFE_XML", message: "OPML files with entity declarations are not allowed." }] }
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(raw, "application/xml")

  if (doc.querySelector("parsererror")) {
    return { feeds: [], errors: [{ code: "INVALID_XML", message: "OPML file could not be parsed." }] }
  }

  const body = doc.querySelector("body")
  if (!body) {
    return { feeds: [], errors: [{ code: "MISSING_BODY", message: "OPML body is missing." }] }
  }

  const feeds = []
  const seen = new Set()

  for (const outline of Array.from(body.children).filter((node) => node.tagName.toLowerCase() === "outline")) {
    walkOutline(outline, "", { feeds, seen, errors, maxFeeds })
  }

  return { feeds, errors }
}

function walkOutline(node, parentCollection, context) {
  const xmlUrl = normalizeHttpUrl(node.getAttribute("xmlUrl") || node.getAttribute("xmlurl") || "")
  const title = (node.getAttribute("title") || node.getAttribute("text") || "").trim()
  const isFolder = !xmlUrl
  const collectionName = isFolder ? (title || parentCollection) : parentCollection

  if (xmlUrl) {
    if (context.feeds.length >= context.maxFeeds) {
      if (!context.errors.some((error) => error.code === "TOO_MANY_FEEDS")) {
        context.errors.push({ code: "TOO_MANY_FEEDS", message: `Only the first ${context.maxFeeds} feeds can be imported.` })
      }
      return
    }

    if (!context.seen.has(xmlUrl)) {
      context.seen.add(xmlUrl)
      context.feeds.push({
        title: title || new URL(xmlUrl).hostname,
        feedUrl: xmlUrl,
        siteUrl: normalizeHttpUrl(node.getAttribute("htmlUrl") || node.getAttribute("htmlurl") || ""),
        collectionName: parentCollection
      })
    }
  }

  for (const child of Array.from(node.children).filter((entry) => entry.tagName.toLowerCase() === "outline")) {
    walkOutline(child, collectionName, context)
  }
}

function normalizeHttpUrl(value) {
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
