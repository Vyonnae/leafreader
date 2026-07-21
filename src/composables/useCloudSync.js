import { computed, onBeforeUnmount, ref, watch } from "vue"
import { DEFAULT_SETTINGS } from "./useLeafReaderStorage"
import { useAuth } from "./useAuth"
import { isSupabaseConfigured } from "../services/supabaseClient"
import {
  createCollection,
  getCollections,
  getProfile,
  getSubscriptions,
  getUserSettings,
  upsertSubscriptions,
  upsertUserSettings,
} from "../services/userDataService"

const decisionKey = (userId) => `leafreader-cloud-migration:${userId}`

function settingsAreDefault(settings) {
  return Object.entries(DEFAULT_SETTINGS).every(
    ([key, value]) => settings?.[key] === value,
  )
}

function hasLocalData(snapshot) {
  return (
    !settingsAreDefault(snapshot.settings) ||
    Boolean(snapshot.userPublications?.length) ||
    Boolean(snapshot.collections?.length)
  )
}

function readDecision(userId) {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(decisionKey(userId))
}

function writeDecision(userId, value) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(decisionKey(userId), value)
}

export function useCloudSync({
  settings,
  userPublications,
  getLocalSnapshot,
  applyCloudSettings,
  applyPublications,
}) {
  const { user, isAuthenticated } = useAuth()
  const syncState = ref(isSupabaseConfigured ? "local" : "offline")
  const errorMessage = ref("")
  const migrationPromptOpen = ref(false)
  const migrationSummary = ref({ publications: 0, collections: 0 })
  const profile = ref(null)
  const subscriptions = ref([])
  const collections = ref([])

  let cloudSettings = null
  let syncReady = false
  let syncPaused = false
  let applyingCloud = false
  let settingsTimer = null
  let publicationsTimer = null

  const statusLabel = computed(() => {
    if (!isSupabaseConfigured) return "Cloud sync unavailable"
    return {
      local: "Local reading space",
      syncing: "Syncing changes…",
      synced: "Cloud synced",
      offline: "Offline · saved locally",
      error: "Cloud sync needs attention",
    }[syncState.value]
  })

  function setError(error) {
    errorMessage.value = error?.message || "Cloud sync needs attention."
    syncState.value =
      typeof navigator !== "undefined" && !navigator.onLine
        ? "offline"
        : "error"
  }

  async function loadCloudData(currentUser) {
    syncState.value = "syncing"
    errorMessage.value = ""

    const [
      settingsResult,
      profileResult,
      subscriptionsResult,
      collectionsResult,
    ] = await Promise.all([
      getUserSettings(currentUser.id),
      getProfile(currentUser.id),
      getSubscriptions(currentUser.id),
      getCollections(currentUser.id),
    ])

    const firstError = [
      settingsResult,
      profileResult,
      subscriptionsResult,
      collectionsResult,
    ].find((response) => response.error)?.error

    if (firstError) {
      setError(firstError)
      return
    }

    cloudSettings = settingsResult.data
    profile.value = profileResult.data
    subscriptions.value = subscriptionsResult.data || []
    collections.value = collectionsResult.data || []

    const snapshot = getLocalSnapshot()
    const decision = readDecision(currentUser.id)

    if (hasLocalData(snapshot) && !decision) {
      applyingCloud = true
      applyCloudSettings(snapshot.settings)
      applyPublications({ localPublications: snapshot.userPublications })
      queueMicrotask(() => {
        applyingCloud = false
      })
      migrationSummary.value = {
        publications: snapshot.userPublications?.length || 0,
        collections: snapshot.collections?.length || 0,
      }
      migrationPromptOpen.value = true
      syncPaused = true
      syncReady = true
      syncState.value = "local"
      return
    }

    if (decision === "keep-local") {
      syncPaused = true
      syncReady = true
      syncState.value = "local"
      return
    }

    applyPublications({
      localPublications:
        decision === "migrated" ? snapshot.userPublications : [],
      cloudSubscriptions: subscriptions.value,
    })

    if (cloudSettings) {
      applyingCloud = true
      applyCloudSettings(cloudSettings)
      queueMicrotask(() => {
        applyingCloud = false
      })
    }

    syncPaused = false
    syncReady = true
    syncState.value = "synced"
  }

  async function migrateLocalData() {
    if (!user.value) return
    const snapshot = getLocalSnapshot()
    migrationPromptOpen.value = false
    syncState.value = "syncing"

    if (!cloudSettings || settingsAreDefault(cloudSettings)) {
      const settingsResult = await upsertUserSettings(
        user.value.id,
        snapshot.settings,
      )
      if (settingsResult.error) {
        setError(settingsResult.error)
        migrationPromptOpen.value = true
        return
      }
      cloudSettings = settingsResult.data
      applyingCloud = true
      applyCloudSettings(snapshot.settings)
      queueMicrotask(() => {
        applyingCloud = false
      })
    } else {
      // A non-default cloud profile wins; explicit migration never silently overwrites it.
      applyingCloud = true
      applyCloudSettings(cloudSettings)
      queueMicrotask(() => {
        applyingCloud = false
      })
    }

    const subscriptionsResult = await upsertSubscriptions(
      user.value.id,
      snapshot.userPublications || [],
    )
    if (subscriptionsResult.error) {
      setError(subscriptionsResult.error)
      migrationPromptOpen.value = true
      return
    }

    const refreshedSubscriptions = await getSubscriptions(user.value.id)
    if (refreshedSubscriptions.error) {
      setError(refreshedSubscriptions.error)
      migrationPromptOpen.value = true
      return
    }
    subscriptions.value = refreshedSubscriptions.data || []
    applyPublications({
      localPublications: snapshot.userPublications,
      cloudSubscriptions: subscriptions.value,
    })

    const knownNames = new Set(
      collections.value.map((collection) => collection.name.toLowerCase()),
    )
    for (const collection of snapshot.collections || []) {
      if (!collection.name || knownNames.has(collection.name.toLowerCase()))
        continue
      const result = await createCollection(user.value.id, collection)
      if (result.error) {
        setError(result.error)
        migrationPromptOpen.value = true
        return
      }
      collections.value.push(result.data)
      knownNames.add(result.data.name.toLowerCase())
    }

    writeDecision(user.value.id, "migrated")
    syncPaused = false
    syncReady = true
    syncState.value = "synced"
  }

  function keepLocalOnly() {
    if (!user.value) return
    writeDecision(user.value.id, "keep-local")
    migrationPromptOpen.value = false
    syncPaused = true
    syncState.value = "local"
  }

  async function syncSettingsNow() {
    if (
      !user.value ||
      !isAuthenticated.value ||
      !syncReady ||
      syncPaused ||
      applyingCloud
    )
      return
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      syncState.value = "offline"
      return
    }

    syncState.value = "syncing"
    const response = await upsertUserSettings(user.value.id, settings.value)
    if (response.error) {
      setError(response.error)
      return
    }
    cloudSettings = response.data
    errorMessage.value = ""
    syncState.value = "synced"
  }

  function scheduleSettingsSync() {
    window.clearTimeout(settingsTimer)
    settingsTimer = window.setTimeout(syncSettingsNow, 550)
  }

  async function syncPublicationsNow() {
    if (
      !user.value ||
      !isAuthenticated.value ||
      !syncReady ||
      syncPaused ||
      !userPublications.value.some((publication) => publication.feedId)
    )
      return

    const response = await upsertSubscriptions(
      user.value.id,
      userPublications.value,
    )
    if (response.error) setError(response.error)
  }

  function schedulePublicationSync() {
    window.clearTimeout(publicationsTimer)
    publicationsTimer = window.setTimeout(syncPublicationsNow, 700)
  }

  async function retrySync() {
    if (!user.value) return
    syncPaused = false
    await loadCloudData(user.value)
    if (syncReady && !migrationPromptOpen.value) await syncSettingsNow()
  }

  function handleOffline() {
    if (isAuthenticated.value) syncState.value = "offline"
  }

  function handleOnline() {
    if (isAuthenticated.value && !syncPaused && !migrationPromptOpen.value)
      retrySync()
  }

  watch(
    user,
    (currentUser) => {
      window.clearTimeout(settingsTimer)
      syncReady = false
      syncPaused = false
      migrationPromptOpen.value = false
      profile.value = null
      subscriptions.value = []
      collections.value = []

      if (!currentUser) {
        syncState.value = isSupabaseConfigured ? "local" : "offline"
        return
      }

      loadCloudData(currentUser)
    },
    { immediate: true },
  )

  watch(settings, scheduleSettingsSync, { deep: true })
  watch(userPublications, schedulePublicationSync, { deep: true })

  if (typeof window !== "undefined") {
    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)
  }

  onBeforeUnmount(() => {
    window.clearTimeout(settingsTimer)
    window.clearTimeout(publicationsTimer)
    window.removeEventListener("offline", handleOffline)
    window.removeEventListener("online", handleOnline)
  })

  return {
    syncState,
    statusLabel,
    errorMessage,
    migrationPromptOpen,
    migrationSummary,
    profile,
    subscriptions,
    collections,
    migrateLocalData,
    keepLocalOnly,
    retrySync,
  }
}
