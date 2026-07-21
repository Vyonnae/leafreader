import { requireUser } from "../_lib/auth.js"
import { discoverFeed } from "../_lib/feedDiscovery.js"
import { json, readJsonBody, withApi } from "../_lib/responses.js"

export default withApi(async (req, res, requestId) => {
  await requireUser(req)
  const body = await readJsonBody(req)
  const discovered = await discoverFeed(body.url)

  return json(res, 200, {
    feed: discovered.parsed.feed,
    articlesPreview: discovered.parsed.articles.slice(0, 5).map((article) => ({
      title: article.title,
      publishedAt: article.publishedAt,
      excerpt: article.excerpt
    }))
  }, requestId)
}, ["POST"])
