export const STORAGE_KEY = "leafreader-state-v1"
const STORAGE_USER_PREFIX = `${STORAGE_KEY}:user:`

export const DEFAULT_SETTINGS = {
  fontSize: "medium",
  readingWidth: "comfortable",
  readingBackground: "fresh",
  readingTheme: "light",
  defaultFocusMode: false,
  defaultLayout: "list",
  sidebarCollapsed: false,
  showExcerpts: true,
  motion: "full",
  autoMarkAsRead: true,
  openOriginalInNewTab: true,
  showNotifications: true,
}

const VERSION = 1

const ALLOWED_VALUES = {
  fontSize: ["small", "medium", "large"],
  readingWidth: ["narrow", "comfortable", "wide"],
  readingBackground: ["fresh", "paper"],
  readingTheme: ["light", "sepia", "dark"],
  defaultLayout: ["list", "cards"],
  motion: ["full", "reduced"],
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function sanitizeSettings(value) {
  if (!isPlainObject(value)) return { ...DEFAULT_SETTINGS }

  const settings = { ...DEFAULT_SETTINGS }
  Object.entries(DEFAULT_SETTINGS).forEach(([key, fallback]) => {
    const nextValue = value[key]
    if (key in ALLOWED_VALUES) {
      settings[key] = ALLOWED_VALUES[key].includes(nextValue)
        ? nextValue
        : fallback
      return
    }
    settings[key] = typeof nextValue === "boolean" ? nextValue : fallback
  })

  return settings
}

function sanitizeIdList(value) {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(value.filter((id) => ["number", "string"].includes(typeof id))),
  )
}

function sanitizeHistory(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry) => isPlainObject(entry) && ["number", "string"].includes(typeof entry.articleId))
    .map((entry) => ({
      articleId: entry.articleId,
      readAt: typeof entry.readAt === "string" ? entry.readAt : new Date().toISOString(),
      progress: Math.min(100, Math.max(0, Number(entry.progress || 0))),
    }))
    .slice(0, 200)
}

function sanitizeArticleMeta(value) {
  if (!isPlainObject(value)) return {}
  return Object.entries(value).reduce((meta, [id, entry]) => {
    if (!isPlainObject(entry)) return meta
    meta[id] = {
      tags: Array.isArray(entry.tags)
        ? Array.from(new Set(entry.tags.filter((tag) => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean))).slice(0, 12)
        : [],
      readingProgress: Math.min(100, Math.max(0, Number(entry.readingProgress || entry.progress || 0))),
      lastReadAt: typeof entry.lastReadAt === "string" ? entry.lastReadAt : null,
    }
    return meta
  }, {})
}

function sanitizePublication(publication) {
  if (!isPlainObject(publication) || typeof publication.name !== "string")
    return null
  const name = publication.name.trim()
  if (!name) return null

  return {
    name,
    count: Number.isFinite(publication.count) ? publication.count : 0,
    color:
      typeof publication.color === "string" ? publication.color : "#e4eadf",
    mark:
      typeof publication.mark === "string" && publication.mark.trim()
        ? publication.mark.trim().slice(0, 3).toUpperCase()
        : name.slice(0, 2).toUpperCase(),
    isUserAdded: true,
  }
}

function sanitizePublications(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  return value.reduce((items, item) => {
    const publication = sanitizePublication(item)
    if (!publication || seen.has(publication.name.toLowerCase())) return items
    seen.add(publication.name.toLowerCase())
    items.push(publication)
    return items
  }, [])
}

export function getLeafReaderStorageKey(userId = null) {
  return userId ? `${STORAGE_USER_PREFIX}${userId}` : STORAGE_KEY
}

export function loadLeafReaderState(userId = null) {
  if (typeof window === "undefined") {
    return {
      hasStoredState: false,
      version: VERSION,
      settings: { ...DEFAULT_SETTINGS },
      articleState: { readIds: [], savedIds: [] },
      articleHistory: [],
      articleMeta: {},
      userPublications: [],
    }
  }

  try {
    const storageKey = getLeafReaderStorageKey(userId)
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) {
      return {
        hasStoredState: false,
        version: VERSION,
        settings: { ...DEFAULT_SETTINGS },
        articleState: { readIds: [], savedIds: [] },
        articleHistory: [],
        articleMeta: {},
        userPublications: [],
      }
    }

    const parsed = JSON.parse(raw)
    if (!isPlainObject(parsed) || parsed.version !== VERSION) {
      throw new Error("Unsupported LeafReader storage shape")
    }

    return {
      hasStoredState: true,
      version: VERSION,
      settings: sanitizeSettings(parsed.settings),
      articleState: {
        readIds: sanitizeIdList(parsed.articleState?.readIds),
        savedIds: sanitizeIdList(parsed.articleState?.savedIds),
      },
      articleHistory: sanitizeHistory(parsed.articleHistory),
      articleMeta: sanitizeArticleMeta(parsed.articleMeta),
      userPublications: sanitizePublications(parsed.userPublications),
    }
  } catch (error) {
    console.warn("LeafReader ignored damaged localStorage data.", error)
    window.localStorage.removeItem(getLeafReaderStorageKey(userId))
    return {
      hasStoredState: false,
      version: VERSION,
      settings: { ...DEFAULT_SETTINGS },
      articleState: { readIds: [], savedIds: [] },
      articleHistory: [],
      articleMeta: {},
      userPublications: [],
    }
  }
}

export function saveLeafReaderState(state, userId = null) {
  if (typeof window === "undefined") return

  const payload = {
    version: VERSION,
    settings: sanitizeSettings(state.settings),
    articleState: {
      readIds: sanitizeIdList(state.articleState?.readIds),
      savedIds: sanitizeIdList(state.articleState?.savedIds),
    },
    articleHistory: sanitizeHistory(state.articleHistory),
    articleMeta: sanitizeArticleMeta(state.articleMeta),
    userPublications: sanitizePublications(state.userPublications),
  }

  window.localStorage.setItem(
    getLeafReaderStorageKey(userId),
    JSON.stringify(payload),
  )
}

export function clearLeafReaderState(userId = null) {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(getLeafReaderStorageKey(userId))
}

export function useLeafReaderStorage(userId = null) {
  const storageKey = getLeafReaderStorageKey(userId)
  return {
    storageKey,
    defaultSettings: DEFAULT_SETTINGS,
    loadState: () => loadLeafReaderState(userId),
    loadGuestState: () => loadLeafReaderState(),
    saveState: (state) => saveLeafReaderState(state, userId),
    clearState: () => clearLeafReaderState(userId),
  }
}
