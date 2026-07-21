import { requireUser } from "../_lib/auth.js"
import { createAdminClient } from "../_lib/supabaseServer.js"
import { json, readJsonBody, withApi } from "../_lib/responses.js"
import { refreshFeedUrl } from "../_lib/refreshFeed.js"
import { subscribeUser } from "../_lib/feedRepository.js"

export default withApi(async (req, res, requestId) => {
  const { user, caller } = await requireUser(req)
  const body = await readJsonBody(req)
  const admin = createAdminClient()
  const result = await refreshFeedUrl(admin, body.url, { userId: user.id, trigger: "subscribe" })
  const subscription = await subscribeUser(caller, user.id, result.feed.id, body.customTitle || null, body.collectionId || null)

  return json(res, 201, {
    subscription,
    feed: result.feed,
    articlesCreated: result.articlesCreated
  }, requestId)
}, ["POST"])
