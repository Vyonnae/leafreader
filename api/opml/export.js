import { requireUser } from "../_lib/auth.js"
import { buildOpmlDocument } from "../_lib/opml.js"
import { setHeader, withApi } from "../_lib/responses.js"

export default withApi(async (req, res, requestId) => {
  const { user, caller } = await requireUser(req)
  const { data, error } = await caller
    .from("subscriptions")
    .select("custom_title, feed:feeds(feed_url, site_url, title), collection:collections(name)")
    .eq("user_id", user.id)
    .order("created_at")

  if (error) throw error

  const xml = buildOpmlDocument((data || []).map((subscription) => ({
    title: subscription.custom_title || subscription.feed?.title || "Untitled feed",
    feedUrl: subscription.feed?.feed_url || "",
    siteUrl: subscription.feed?.site_url || "",
    collectionName: subscription.collection?.name || "LeafReader"
  })).filter((feed) => feed.feedUrl))

  setHeader(res, "Content-Type", "application/xml; charset=utf-8")
  setHeader(res, "Content-Disposition", 'attachment; filename="leafreader-subscriptions.opml"')
  setHeader(res, "X-Request-ID", requestId)
  res.statusCode = 200
  if (typeof res.status === "function" && typeof res.send === "function") return res.status(200).send(xml)
  if (typeof res.end === "function") return res.end(xml)
  res.body = xml
  return res
}, ["GET"])
