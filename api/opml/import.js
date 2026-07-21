import { requireUser } from "../_lib/auth.js"
import { refreshFeedUrl } from "../_lib/refreshFeed.js"
import { subscribeUser } from "../_lib/feedRepository.js"
import { summarizeImportResults } from "../_lib/opml.js"
import { createAdminClient } from "../_lib/supabaseServer.js"
import { json, readJsonBody, withApi } from "../_lib/responses.js"

export default withApi(async (req, res, requestId) => {
  const { user, caller } = await requireUser(req)
  const body = await readJsonBody(req, { maxBytes: 256 * 1024 })
  const feeds = Array.isArray(body.feeds) ? body.feeds.slice(0, 100) : []
  const admin = createAdminClient()
  const results = []

  for (const feed of feeds) {
    try {
      const refreshed = await refreshFeedUrl(admin, feed.feedUrl, { userId: user.id, trigger: "opml" })
      try {
        await subscribeUser(caller, user.id, refreshed.feed.id, feed.title || null, feed.collectionId || null)
        results.push({ feedUrl: feed.feedUrl, status: "imported", title: refreshed.feed.title })
      } catch (error) {
        if (error.status === 409 || error.code === "23505") results.push({ feedUrl: feed.feedUrl, status: "skipped", reason: "already_subscribed" })
        else throw error
      }
    } catch (error) {
      results.push({ feedUrl: feed.feedUrl, status: "failed", message: error.message })
    }
  }

  return json(res, 200, { ...summarizeImportResults(results), results }, requestId)
}, ["POST"])
