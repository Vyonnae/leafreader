import { discoverFeed } from "./feedDiscovery.js"
import { recordFetchLog, upsertArticles, upsertFeed } from "./feedRepository.js"

export async function refreshFeedUrl(admin, feedUrl, options = {}) {
  const startedAt = Date.now()

  try {
    const discovered = await discoverFeed(feedUrl)
    const feed = await upsertFeed(admin, discovered.parsed.feed)
    const articles = await upsertArticles(admin, feed.id, discovered.parsed.articles)

    await recordFetchLog(admin, {
      feedId: feed.id,
      userId: options.userId,
      trigger: options.trigger || "manual",
      status: "success",
      articlesFound: discovered.parsed.articles.length,
      articlesCreated: articles.count,
      durationMs: Date.now() - startedAt
    })

    return { feed, articles: articles.data, articlesCreated: articles.count, parsed: discovered.parsed }
  } catch (error) {
    if (options.feedId) {
      await recordFetchLog(admin, {
        feedId: options.feedId,
        userId: options.userId,
        trigger: options.trigger || "manual",
        status: "error",
        errorMessage: error.message,
        durationMs: Date.now() - startedAt
      })
    }
    throw error
  }
}
