export async function upsertFeed(admin, feed) {
  const { data, error } = await admin
    .from("feeds")
    .upsert({
      feed_url: feed.feedUrl,
      site_url: feed.siteUrl || null,
      title: feed.title,
      description: feed.description || null,
      status: "active",
      last_success_at: new Date().toISOString(),
      last_fetched_at: new Date().toISOString(),
      last_error: null,
      error_count: 0
    }, { onConflict: "feed_url" })
    .select("*")
    .single()

  if (error) throw dataError(error)
  return data
}

export async function upsertArticles(admin, feedId, articles) {
  const rows = articles.map((article) => ({
    feed_id: feedId,
    guid: article.guid,
    url: article.url || null,
    title: article.title,
    author: article.author || null,
    excerpt: article.excerpt || null,
    content_html: article.contentHtml || null,
    image_url: article.imageUrl || null,
    published_at: article.publishedAt,
    reading_time: article.readingTimeMinutes
  }))

  if (!rows.length) return { data: [], count: 0 }

  const { data, error } = await admin
    .from("articles")
    .upsert(rows, { onConflict: "feed_id,guid" })
    .select("*")

  if (error) throw dataError(error)
  return { data: data || [], count: data?.length || 0 }
}

export async function recordFetchLog(admin, entry) {
  await admin.from("feed_fetch_logs").insert({
    feed_id: entry.feedId || null,
    user_id: entry.userId || null,
    trigger: entry.trigger || "manual",
    status: entry.status,
    http_status: entry.httpStatus || null,
    articles_found: entry.articlesFound || 0,
    articles_created: entry.articlesCreated || 0,
    error_message: entry.errorMessage || null,
    duration_ms: entry.durationMs || null
  })
}

export async function subscribeUser(caller, userId, feedId, customTitle = null, collectionId = null) {
  const { data, error } = await caller
    .from("subscriptions")
    .insert({
      user_id: userId,
      feed_id: feedId,
      custom_title: customTitle,
      collection_id: collectionId
    })
    .select("id, user_id, feed_id, custom_title, collection_id, is_user_added, created_at, feed:feeds(*)")
    .single()

  if (error) throw dataError(error, error.code === "23505" ? 409 : undefined)
  return data
}

export function dataError(error, status = 500) {
  const wrapped = new Error(error.message || "Database request failed.")
  wrapped.code = error.code || "DATABASE_ERROR"
  wrapped.status = status
  return wrapped
}
