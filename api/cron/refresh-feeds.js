import { verifyCronAuthorization } from "../_lib/cronAuth.js"
import { json, withApi } from "../_lib/responses.js"
import { refreshFeedUrl } from "../_lib/refreshFeed.js"
import { createAdminClient } from "../_lib/supabaseServer.js"

export default withApi(async (req, res, requestId) => {
  const cron = verifyCronAuthorization(req)
  if (!cron.ok) return json(res, cron.status, cron.error, requestId)

  const admin = createAdminClient()
  const { data: feeds, error } = await admin.rpc("claim_feeds_for_refresh", {
    batch_limit: 12,
    stale_before: new Date(Date.now() - 60 * 60 * 1000).toISOString()
  })
  if (error) throw error

  const startedAt = Date.now()
  let refreshed = 0
  let failed = 0
  let articlesCreated = 0

  for (const feed of feeds || []) {
    try {
      const result = await refreshFeedUrl(admin, feed.feed_url, { feedId: feed.id, trigger: "cron" })
      refreshed += 1
      articlesCreated += result.articlesCreated || 0
    } catch {
      failed += 1
    }
  }

  return json(res, 200, {
    claimed: feeds?.length || 0,
    refreshed,
    failed,
    articlesCreated,
    durationMs: Date.now() - startedAt
  }, requestId)
}, ["GET"])
