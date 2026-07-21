import { isSupabaseConfigured, supabase } from "./supabaseClient"

const cloudUnavailable = {
  code: "cloud_unavailable",
  message: "Cloud sync is unavailable. Your local reading space is still safe.",
}

const settingColumns = {
  fontSize: "font_size",
  readingWidth: "reading_width",
  readingBackground: "reading_background",
  defaultFocusMode: "default_focus_mode",
  defaultLayout: "default_layout",
  sidebarCollapsed: "sidebar_collapsed",
  showExcerpts: "show_excerpts",
  motion: "motion",
  autoMarkAsRead: "auto_mark_as_read",
  openOriginalInNewTab: "open_original_in_new_tab",
  showNotifications: "show_notifications",
}

function serviceResult(data = null, error = null) {
  return { data, error }
}

function friendlyDataError(error, fallback) {
  if (!error) return { code: "unknown", message: fallback }

  const source = `${error.code || ""} ${error.message || ""}`.toLowerCase()
  let message = fallback

  if (source.includes("row-level security") || error.code === "42501") {
    message = "LeafReader could not access this account data."
  } else if (error.code === "23505" || source.includes("duplicate")) {
    message = "That item already exists in your account."
  } else if (source.includes("fetch") || source.includes("network")) {
    message = "Cloud sync is offline. LeafReader will keep using local data."
  } else if (error.code === "23503") {
    message = "This item is not available in the cloud yet."
  }

  if (import.meta.env.DEV) {
    console.warn("LeafReader cloud data request failed.", {
      code: error.code,
      details: error.details,
    })
  }

  return { code: error.code || "cloud_error", message }
}

async function runDataRequest(request, fallback) {
  if (!isSupabaseConfigured || !supabase)
    return serviceResult(null, cloudUnavailable)

  try {
    const { data, error } = await request()
    return error
      ? serviceResult(null, friendlyDataError(error, fallback))
      : serviceResult(data)
  } catch (error) {
    return serviceResult(null, friendlyDataError(error, fallback))
  }
}

function settingsToRow(userId, settings) {
  const row = { user_id: userId }
  Object.entries(settingColumns).forEach(([localKey, column]) => {
    if (localKey in settings) row[column] = settings[localKey]
  })
  return row
}

function settingsFromRow(row) {
  if (!row) return null
  return Object.fromEntries(
    Object.entries(settingColumns).map(([localKey, column]) => [
      localKey,
      row[column],
    ]),
  )
}

export async function getUserSettings(userId) {
  const response = await runDataRequest(
    () =>
      supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
    "LeafReader could not load your settings.",
  )
  return response.error
    ? response
    : serviceResult(settingsFromRow(response.data))
}

export async function upsertUserSettings(userId, settings) {
  const response = await runDataRequest(
    () =>
      supabase
        .from("user_settings")
        .upsert(settingsToRow(userId, settings), { onConflict: "user_id" })
        .select("*")
        .single(),
    "LeafReader could not save your settings.",
  )
  return response.error
    ? response
    : serviceResult(settingsFromRow(response.data))
}

export function getArticleStates(userId, articleIds = []) {
  return runDataRequest(() => {
    let query = supabase
      .from("article_states")
      .select("*")
      .eq("user_id", userId)
    if (articleIds.length) query = query.in("article_id", articleIds)
    return query
  }, "LeafReader could not load article states.")
}

export function upsertArticleState(userId, articleId, state) {
  return runDataRequest(
    () =>
      supabase
        .from("article_states")
        .upsert(
          {
            user_id: userId,
            article_id: articleId,
            is_read: Boolean(state.isRead),
            is_saved: Boolean(state.isSaved),
            read_at: state.isRead
              ? state.readAt || new Date().toISOString()
              : null,
            saved_at: state.isSaved
              ? state.savedAt || new Date().toISOString()
              : null,
          },
          { onConflict: "user_id,article_id" },
        )
        .select("*")
        .single(),
    "LeafReader could not save the article state.",
  )
}

export function getSubscriptions(userId) {
  return runDataRequest(
    () =>
      supabase
        .from("subscriptions")
        .select(
          "id, user_id, feed_id, custom_title, collection_id, is_user_added, created_at, feed:feeds(id, feed_url, site_url, title, description, icon_url, status)",
        )
        .eq("user_id", userId)
        .order("created_at"),
    "LeafReader could not load your publications.",
  )
}

export function upsertSubscriptions(userId, subscriptions) {
  const rows = subscriptions
    .filter((subscription) => subscription.feedId)
    .map((subscription) => ({
      user_id: userId,
      feed_id: subscription.feedId,
      custom_title: subscription.customTitle || subscription.name || null,
      collection_id: subscription.collectionId || null,
      is_user_added: subscription.isUserAdded !== false,
    }))

  if (!rows.length) return Promise.resolve(serviceResult([]))

  return runDataRequest(
    () =>
      supabase
        .from("subscriptions")
        .upsert(rows, { onConflict: "user_id,feed_id" })
        .select("*"),
    "LeafReader could not sync your publications.",
  )
}

export function getCollections(userId) {
  return runDataRequest(
    () =>
      supabase
        .from("collections")
        .select("*")
        .eq("user_id", userId)
        .order("created_at"),
    "LeafReader could not load your collections.",
  )
}

export function createCollection(userId, collection) {
  return runDataRequest(
    () =>
      supabase
        .from("collections")
        .insert({
          user_id: userId,
          name: collection.name.trim(),
          color: collection.color || "#dce9df",
        })
        .select("*")
        .single(),
    "LeafReader could not create the collection.",
  )
}

export function updateCollection(userId, collectionId, updates) {
  return runDataRequest(
    () =>
      supabase
        .from("collections")
        .update({
          ...(updates.name ? { name: updates.name.trim() } : {}),
          ...(updates.color ? { color: updates.color } : {}),
        })
        .eq("id", collectionId)
        .eq("user_id", userId)
        .select("*")
        .single(),
    "LeafReader could not update the collection.",
  )
}

export function deleteCollection(userId, collectionId) {
  return runDataRequest(
    () =>
      supabase
        .from("collections")
        .delete()
        .eq("id", collectionId)
        .eq("user_id", userId),
    "LeafReader could not delete the collection.",
  )
}

export function getProfile(userId) {
  return runDataRequest(
    () => supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    "LeafReader could not load your profile.",
  )
}

export function updateProfile(userId, updates) {
  return runDataRequest(
    () =>
      supabase
        .from("profiles")
        .update({
          ...(typeof updates.displayName === "string"
            ? { display_name: updates.displayName.trim() || null }
            : {}),
          ...(typeof updates.avatarUrl === "string"
            ? { avatar_url: updates.avatarUrl.trim() || null }
            : {}),
        })
        .eq("id", userId)
        .select("*")
        .single(),
    "LeafReader could not update your profile.",
  )
}

export const userDataService = {
  getUserSettings,
  upsertUserSettings,
  getArticleStates,
  upsertArticleState,
  getSubscriptions,
  upsertSubscriptions,
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  getProfile,
  updateProfile,
}
