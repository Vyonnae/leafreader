import { requireUser } from "./_lib/auth.js"
import { createAdminClient } from "./_lib/supabaseServer.js"
import { json, withApi } from "./_lib/responses.js"

export default withApi(async (req, res, requestId) => {
  const { user, caller } = await requireUser(req)
  const url = new URL(req.url || "/api/library", "https://leafreader.local")
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 100)

  const { data: subscriptions, error: subscriptionError } = await caller
    .from("subscriptions")
    .select("id, feed_id, custom_title, collection_id, is_user_added, created_at, feed:feeds(*)")
    .eq("user_id", user.id)
    .order("created_at")

  if (subscriptionError) throw subscriptionError

  const feedIds = (subscriptions || []).map((subscription) => subscription.feed_id)
  if (!feedIds.length) return json(res, 200, { subscriptions: [], articles: [], cursor: null }, requestId)

  let articleQuery = createAdminClient()
    .from("articles")
    .select("*")
    .in("feed_id", feedIds)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit)

  const feedId = url.searchParams.get("feedId")
  if (feedId && feedIds.includes(feedId)) articleQuery = articleQuery.eq("feed_id", feedId)

  const { data: articles, error: articleError } = await articleQuery
  if (articleError) throw articleError

  const articleIds = (articles || []).map((article) => article.id)
  let states = []
  if (articleIds.length) {
    const { data, error } = await caller
      .from("article_states")
      .select("*")
      .eq("user_id", user.id)
      .in("article_id", articleIds)
    if (error) throw error
    states = data || []
  }

  return json(res, 200, {
    subscriptions,
    articles,
    articleStates: states,
    cursor: articles?.length === limit ? articles[articles.length - 1]?.published_at : null
  }, requestId)
}, ["GET"])
