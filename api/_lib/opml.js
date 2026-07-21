export function xmlEscape(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export function buildOpmlDocument(subscriptions = []) {
  const groups = new Map()
  for (const subscription of subscriptions) {
    const group = subscription.collectionName || "LeafReader"
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group).push(subscription)
  }

  const body = Array.from(groups.entries()).map(([collectionName, feeds]) => {
    const outlines = feeds.map((feed) => (
      `    <outline text="${xmlEscape(feed.title)}" title="${xmlEscape(feed.title)}" type="rss" xmlUrl="${xmlEscape(feed.feedUrl)}"${feed.siteUrl ? ` htmlUrl="${xmlEscape(feed.siteUrl)}"` : ""}/>`
    )).join("\n")
    return `  <outline text="${xmlEscape(collectionName)}" title="${xmlEscape(collectionName)}">\n${outlines}\n  </outline>`
  }).join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n<head>\n  <title>LeafReader subscriptions</title>\n</head>\n<body>\n${body}\n</body>\n</opml>\n`
}

export function summarizeImportResults(results) {
  return results.reduce((summary, result) => {
    if (result.status === "imported") summary.imported += 1
    else if (result.status === "skipped") summary.skipped += 1
    else summary.failed += 1
    return summary
  }, { imported: 0, skipped: 0, failed: 0 })
}
