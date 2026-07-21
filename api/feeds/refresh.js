import { requireUser } from "../_lib/auth.js"
import { createAdminClient } from "../_lib/supabaseServer.js"
import { json, readJsonBody, withApi } from "../_lib/responses.js"
import { refreshFeedUrl } from "../_lib/refreshFeed.js"

export default withApi(async (req, res, requestId) => {
  const { user, caller } = await requireUser(req)
  const body = await readJsonBody(req)
  const subscriptionId = body.subscriptionId || body.id
  const { data: subscription, error } = await caller
    .from("subscriptions")
    .select("id, feed_id, feed:feeds(id, feed_url, last_fetched_at)")
    .eq("id", subscriptionId)
    .eq("user_id", user.id)
    .single()

  if (error || !subscription) {
    const notFound = new Error("Subscription was not found.")
    notFound.code = "NOT_FOUND"
    notFound.status = 404
    throw notFound
  }

  const lastFetchedAt = subscription.feed?.last_fetched_at ? new Date(subscription.feed.last_fetched_at).getTime() : 0
  if (Date.now() - lastFetchedAt < 5 * 60 * 1000) {
    const cooldown = new Error("This feed was refreshed recently. Try again in a few minutes.")
    cooldown.code = "RATE_LIMITED"
    cooldown.status = 429
    throw cooldown
  }

  const result = await refreshFeedUrl(createAdminClient(), subscription.feed.feed_url, {
    userId: user.id,
    feedId: subscription.feed_id,
    trigger: "manual"
  })

  return json(res, 200, { feed: result.feed, articlesCreated: result.articlesCreated }, requestId)
}, ["POST"])
