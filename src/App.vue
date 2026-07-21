<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Sidebar from './components/app/Sidebar.vue'
import TopBar from './components/app/TopBar.vue'
import StoryList from './components/feed/StoryList.vue'
import ReaderPane from './components/reader/ReaderPane.vue'
import SettingsPanel from './components/settings/SettingsPanel.vue'
import CloudMigrationDialog from './components/cloud/CloudMigrationDialog.vue'
import AddPublicationModal from './components/ui/AddPublicationModal.vue'
import Toast from './components/ui/Toast.vue'
import { useAuth } from './composables/useAuth'
import { useCloudSync } from './composables/useCloudSync'
import { useLeafReaderStorage } from './composables/useLeafReaderStorage'
import {
  discoverFeed,
  deleteAccount,
  exportOpml,
  getLibrary,
  importOpml,
  refreshFeed,
  removeSubscription,
  subscribeToFeed,
  userMessageForFeedError,
} from './services/feedService'
import { updateProfile, upsertArticleState } from './services/userDataService'

const router = useRouter()
const {
  user,
  isAuthenticated,
  isAuthLoading,
  isSigningOut,
  isSupabaseConfigured,
  signOut,
  updatePassword,
} = useAuth()

const {
  storageKey: STORAGE_KEY,
  defaultSettings: DEFAULT_SETTINGS,
  clearState: clearLeafReaderState,
  loadState: loadLeafReaderState,
  loadGuestState,
  saveState: saveLeafReaderState,
} = useLeafReaderStorage(user.value?.id)

const view = ref('All Stories')
const query = ref('')
const selectedPublication = ref('All publications')
const selectedCollection = ref('Morning pages')
const selectedArticle = ref(null)
const showAdd = ref(false)
const showSettings = ref(false)
const newPublication = ref('')
const focusMode = ref(false)
const readerPane = ref(null)
const settingsPanel = ref(null)
const sidebar = ref(null)
const addError = ref('')
const addBusy = ref(false)
const addPreview = ref(null)
const addPreviewUrl = ref('')
const toast = ref('')
const accountBusy = ref(false)
const accountMessage = ref('')
const accountError = ref('')
const migrationBusy = ref(false)

let toastTimer
let suppressNextPersist = false

const storedState = loadLeafReaderState()
const storedReadIds = new Set(storedState.articleState.readIds)
const storedSavedIds = new Set(storedState.articleState.savedIds)
const settings = ref({ ...DEFAULT_SETTINGS, ...storedState.settings })

const initialPublications = [
  { name: 'The Gentle Journal', count: 4, color: '#dce9df', mark: 'GJ', sourceType: 'demo' },
  { name: 'Monocle', count: 2, color: '#e6e1d4', mark: 'M', sourceType: 'demo' },
  { name: 'Kinfolk', count: 3, color: '#e9ded6', mark: 'K', sourceType: 'demo' },
  { name: 'The Marginalian', count: 1, color: '#dbe8e7', mark: 'TM', sourceType: 'demo' },
]

const publications = ref([
  ...initialPublications.map((publication) => ({ ...publication })),
  ...storedState.userPublications,
])

function articleImage(background, accent, shape) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 620">
    <rect width="900" height="620" fill="${background}"/>
    <rect x="74" y="74" width="752" height="472" rx="34" fill="#fffdf8" opacity=".72"/>
    <path d="M0 470c140-54 240-66 372-18s236 54 528-38v206H0z" fill="${accent}" opacity=".18"/>
    <circle cx="718" cy="150" r="72" fill="${accent}" opacity=".16"/>
    <g fill="none" stroke="${accent}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" opacity=".82">
      ${shape === 'leaf' ? '<path d="M286 384c0-154 84-255 240-275 11 155-68 268-205 278"/><path d="M284 408c64-76 128-126 216-171"/>' : ''}
      ${shape === 'paper' ? '<path d="M278 154h280l72 76v250H278z"/><path d="M558 154v82h72"/><path d="M334 298h208M334 362h164"/>' : ''}
      ${shape === 'table' ? '<path d="M240 336h420M306 336v120M594 336v120"/><path d="M360 250c40-58 124-58 164 0"/><path d="M328 252h228"/>' : ''}
      ${shape === 'books' ? '<path d="M284 164v292M382 132v324M480 180v276M578 146v310"/><path d="M250 456h382"/>' : ''}
    </g>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function createInitialArticles() {
  return [
    { id: 1, publication: 'The Gentle Journal', category: 'SLOW LIVING', time: '12 min read', title: 'The small, luminous rituals that make a day feel like your own', excerpt: 'A notebook opened before the inbox, the clear taste of early tea, and the gentle discipline of leaving a little room for wonder.', image: articleImage('#e7f1ea', '#5f8d74', 'leaf'), originalUrl: 'https://example.com/leafreader/the-small-luminous-rituals', collections: ['Morning pages', 'To ponder'], read: false, saved: true, hue: 'sage' },
    { id: 2, publication: 'Monocle', category: 'DESIGN NOTES', time: '8 min read', title: 'A field guide to the quiet confidence of good paper', excerpt: 'From the grain beneath your fingertips to the pause before a handwritten line, material details change how ideas arrive.', image: articleImage('#e7eef0', '#536d72', 'paper'), originalUrl: 'https://monocle.com/', collections: ['Morning pages'], read: false, saved: false, hue: 'blue' },
    { id: 3, publication: 'Kinfolk', category: 'ON THE TABLE', time: '6 min read', title: 'The table is a place for unhurried conversations', excerpt: 'A few linen napkins, seasonal fruit and the permission to make an ordinary weekday feel considered.', image: articleImage('#f4ead6', '#756242', 'table'), originalUrl: 'https://www.kinfolk.com/', collections: ['Morning pages'], read: true, saved: false, hue: 'sand' },
    { id: 4, publication: 'The Marginalian', category: 'IDEAS', time: '10 min read', title: 'Reading is a form of living twice', excerpt: 'Books carry us into a conversation much larger than the one we happen to be having with ourselves today.', image: articleImage('#f4e8df', '#7b5f51', 'books'), originalUrl: 'https://www.themarginalian.org/', collections: ['Morning pages', 'To ponder'], read: false, saved: true, hue: 'peach' },
  ]
}

function hydrateArticles() {
  return createInitialArticles().map((article) => ({
    ...article,
    sourceType: 'demo',
    read: storedState.hasStoredState ? storedReadIds.has(article.id) : article.read,
    saved: storedState.hasStoredState ? storedSavedIds.has(article.id) : article.saved,
  }))
}

const articles = ref(hydrateArticles())

function isDesktopViewport() {
  return typeof window === 'undefined' || window.innerWidth > 900
}

const sidebarOpen = ref(
  typeof window === 'undefined'
    ? !settings.value.sidebarCollapsed
    : window.innerWidth > 900 && !settings.value.sidebarCollapsed
)

const cardView = computed({
  get: () => settings.value.defaultLayout === 'cards',
  set: (value) => updateSetting('defaultLayout', value ? 'cards' : 'list'),
})

const readerFontSize = computed(() => ({
  small: 16,
  medium: 18,
  large: 20,
}[settings.value.fontSize] || 18))

const readerWidth = computed(() => ({
  narrow: { page: '42rem', body: '38.75rem' },
  comfortable: { page: '45rem', body: '42.5rem' },
  wide: { page: '51.25rem', body: '48.75rem' },
}[settings.value.readingWidth] || { page: '45rem', body: '42.5rem' }))

const appStyles = computed(() => ({
  '--leaf-reader-max-width': readerWidth.value.page,
  '--leaf-reader-body-width': readerWidth.value.body,
  '--leaf-reader-surface': settings.value.readingBackground === 'paper' ? '#f6f0e4' : 'var(--leaf-color-card)',
  '--leaf-reader-shell': settings.value.readingBackground === 'paper' ? '#fbf5ea' : 'var(--leaf-color-paper-warm)',
}))

const originalTarget = computed(() => settings.value.openOriginalInNewTab ? '_blank' : null)
const originalRel = computed(() => settings.value.openOriginalInNewTab ? 'noopener noreferrer' : null)
const userPublications = computed(() => publications.value.filter((publication) => publication.isUserAdded && publication.sourceType !== 'cloud'))

const {
  syncState,
  statusLabel: cloudStatusLabel,
  errorMessage: cloudError,
  migrationPromptOpen,
  migrationSummary,
  profile,
  migrateLocalData,
  keepLocalOnly,
  retrySync,
} = useCloudSync({
  settings,
  userPublications,
  getLocalSnapshot: () => {
    const guestState = loadGuestState()
    return {
      settings: { ...guestState.settings },
      userPublications: guestState.userPublications.map((publication) => ({ ...publication })),
      collections: guestState.collections || [],
    }
  },
  applyCloudSettings: (cloudSettings) => {
    settings.value = { ...DEFAULT_SETTINGS, ...cloudSettings }
    if (isDesktopViewport()) sidebarOpen.value = !settings.value.sidebarCollapsed
  },
  applyPublications: ({ localPublications = [], cloudSubscriptions = [] }) => {
    const merged = []
    const seen = new Set(initialPublications.map((publication) => publication.name.toLowerCase()))
    const cloudPublications = cloudSubscriptions.map((subscription) => {
      const name = subscription.custom_title || subscription.feed?.title || 'Untitled publication'
      return {
        name,
        count: 0,
        color: '#e4eadf',
        mark: name.slice(0, 2).toUpperCase(),
        isUserAdded: true,
        feedId: subscription.feed_id,
      }
    })

    const candidates = [...cloudPublications, ...localPublications]
    candidates.forEach((publication) => {
      const key = publication.name.toLowerCase()
      if (seen.has(key)) return
      seen.add(key)
      merged.push({ ...publication, isUserAdded: true })
    })

    publications.value = [
      ...initialPublications.map((publication) => ({ ...publication })),
      ...merged,
    ]
  },
})

const accountLabel = computed(() => (
  profile.value?.display_name
  || user.value?.user_metadata?.display_name
  || user.value?.email
  || 'Guest Reader'
))
const greetingName = computed(() => accountLabel.value === 'Guest Reader'
  ? 'Reader'
  : accountLabel.value.split(/[\s@]/)[0])
const unread = computed(() => articles.value.filter((article) => !article.read).length)
const filteredArticles = computed(() => articles.value.filter((article) => {
  const matchesView = view.value === 'Saved' ? article.saved : true
  const matchesCollection = !selectedCollection.value || article.collections?.includes(selectedCollection.value)
  const matchesPublication = selectedPublication.value === 'All publications' || article.publication === selectedPublication.value
  const term = query.value.toLowerCase()
  const matchesQuery = !term || `${article.title} ${article.excerpt} ${article.publication}`.toLowerCase().includes(term)
  return matchesView && matchesCollection && matchesPublication && matchesQuery
}))
const filteredUnread = computed(() => filteredArticles.value.filter((article) => !article.read).length)

const shellClasses = computed(() => ({
  'is-reading': selectedArticle.value,
  'is-focus': focusMode.value && selectedArticle.value,
  'drawer-open': sidebarOpen.value,
}))

const pageTitle = computed(() => {
  if (selectedPublication.value !== 'All publications') return selectedPublication.value
  if (selectedCollection.value === 'To ponder') return 'To ponder'
  return view.value === 'Saved' ? 'Saved Stories' : 'All Stories'
})

const pageSummary = computed(() => {
  if (query.value) return `${filteredArticles.value.length} search results`
  if (view.value === 'Saved') return `${filteredArticles.value.length} saved stories`
  return `${filteredUnread.value} unread stories`
})

const catalogTitle = computed(() => {
  if (selectedPublication.value !== 'All publications') return selectedPublication.value
  if (selectedCollection.value === 'To ponder') return 'To Ponder'
  return view.value === 'Saved' ? 'Saved Reading Shelf' : 'Today\'s Reading Catalog'
})

const catalogSummary = computed(() => {
  const storyLabel = filteredArticles.value.length === 1 ? 'story' : 'stories'
  return `${filteredArticles.value.length} ${storyLabel} shown - ${filteredUnread.value} unread`
})

const catalogNote = computed(() => {
  if (query.value) return 'Search results gathered from titles, excerpts and publications.'
  if (view.value === 'Saved') return 'A quiet shelf for pieces you want to revisit later.'
  if (selectedCollection.value === 'To ponder') return 'Ideas set aside for a longer, more reflective reading hour.'
  return 'A curated list of new essays, notes and slow reads.'
})

const emptyTitle = computed(() => {
  if (query.value) return 'No stories found.'
  if (view.value === 'Saved') return 'Your reading shelf is still empty.'
  return 'No stories here yet.'
})

const emptyDescription = computed(() => {
  if (query.value) return 'Try another keyword or clear the current search.'
  if (view.value === 'Saved') return 'Save stories you would like to return to later.'
  return 'Add a publication or choose another collection.'
})

function updateSetting(key, value) {
  settings.value = { ...settings.value, [key]: value }
  if (key === 'sidebarCollapsed' && isDesktopViewport()) {
    sidebarOpen.value = !value
  }
}

function updateSettingFromPanel({ key, value }) {
  updateSetting(key, value)
}

function showToast(message, options = {}) {
  if (!options.force && !settings.value.showNotifications) return
  toast.value = message
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toast.value = '' }, 2400)
}

function setSidebarOpen(open) {
  sidebarOpen.value = open
  if (isDesktopViewport()) {
    updateSetting('sidebarCollapsed', !open)
  }
}

function toggleSidebar() {
  setSidebarOpen(!sidebarOpen.value)
}

function closeDrawerOnMobile() {
  if (typeof window !== 'undefined' && window.innerWidth <= 900) sidebarOpen.value = false
}

function setView(item) {
  view.value = item
  closeDrawerOnMobile()
}

function setCollection(collection) {
  selectedCollection.value = collection
  view.value = 'All Stories'
  closeDrawerOnMobile()
}

function clearPublication() {
  selectedPublication.value = 'All publications'
}

function togglePublication(publication) {
  selectedPublication.value = selectedPublication.value === publication.name ? 'All publications' : publication.name
  closeDrawerOnMobile()
}

function mapCloudPublication(subscription) {
  const name = subscription.custom_title || subscription.feed?.title || 'Untitled publication'
  return {
    name,
    count: 0,
    color: '#e4eadf',
    mark: name.slice(0, 2).toUpperCase(),
    isUserAdded: true,
    sourceType: 'cloud',
    feedId: subscription.feed_id,
    subscriptionId: subscription.id,
  }
}

function mapCloudArticle(article, subscriptions, states) {
  const subscription = subscriptions.find((entry) => entry.feed_id === article.feed_id)
  const state = states.find((entry) => entry.article_id === article.id)
  const publication = subscription?.custom_title || subscription?.feed?.title || 'Cloud publication'

  return {
    id: article.id,
    sourceType: 'cloud',
    feedId: article.feed_id,
    publication,
    category: 'RSS',
    time: `${article.reading_time || 1} min read`,
    title: article.title,
    excerpt: article.excerpt || '',
    image: article.image_url || articleImage('#e7f1ea', '#5f8d74', 'leaf'),
    originalUrl: article.url,
    collections: ['Morning pages'],
    read: Boolean(state?.is_read),
    saved: Boolean(state?.is_saved),
    hue: 'sage',
    contentHtml: article.content_html || '',
    author: article.author || '',
    publishedAt: article.published_at,
  }
}

async function loadCloudLibrary() {
  if (!isAuthenticated.value) return

  try {
    const library = await getLibrary({ limit: 100 })
    const cloudPublications = (library.subscriptions || []).map(mapCloudPublication)
    const cloudArticles = (library.articles || []).map((article) => (
      mapCloudArticle(article, library.subscriptions || [], library.articleStates || [])
    ))

    publications.value = [...initialPublications.map((publication) => ({ ...publication })), ...cloudPublications]
    articles.value = cloudArticles
    if (!cloudArticles.some((article) => article.id === selectedArticle.value?.id)) selectedArticle.value = null
  } catch (error) {
    showToast(userMessageForFeedError(error), { force: true })
  }
}

async function openArticle(article) {
  if (settings.value.autoMarkAsRead && !article.read) {
    const previous = { read: article.read, saved: article.saved }
    article.read = true
    persistCloudArticleState(article, previous)
  }
  selectedArticle.value = article
  focusMode.value = settings.value.defaultFocusMode
  await nextTick()
  await readerPane.value?.resetScroll()
}

function closeArticle() {
  selectedArticle.value = null
  focusMode.value = false
}

function toggleSaved(article) {
  const previous = { read: article.read, saved: article.saved }
  article.saved = !article.saved
  persistCloudArticleState(article, previous)
  showToast(article.saved ? 'Saved to your reading shelf.' : 'Removed from saved stories.')
}

function toggleRead(article) {
  const previous = { read: article.read, saved: article.saved }
  article.read = !article.read
  persistCloudArticleState(article, previous)
  showToast(article.read ? 'Marked as read.' : 'Marked as unread.')
}

function markAllRead() {
  articles.value.forEach((article) => { article.read = true })
  showToast('All stories marked as read.')
}

async function persistCloudArticleState(article, previous) {
  if (article.sourceType !== 'cloud' || !user.value?.id) return

  const response = await upsertArticleState(user.value.id, article.id, {
    isRead: article.read,
    isSaved: article.saved,
  })

  if (response.error) {
    article.read = previous.read
    article.saved = previous.saved
    showToast(response.error.message, { force: true })
  }
}

async function addPublication() {
  const url = newPublication.value.trim()
  if (!url) {
    addError.value = 'Paste a feed or website URL before adding it.'
    return
  }

  if (!isAuthenticated.value) {
    closeAddPublication()
    openSignIn()
    return
  }

  if (addBusy.value) return
  addBusy.value = true
  addError.value = ''

  try {
    if (!addPreview.value || addPreviewUrl.value !== url) {
      const result = await discoverFeed(url)
      addPreview.value = result.feed
      addPreviewUrl.value = url
      return
    }

    await subscribeToFeed(url)
    await loadCloudLibrary()
    newPublication.value = ''
    addPreview.value = null
    addPreviewUrl.value = ''
    showAdd.value = false
    showToast('Publication added to cloud sync.')
  } catch (error) {
    addError.value = userMessageForFeedError(error)
  } finally {
    addBusy.value = false
  }
}

function openAddPublication() {
  addError.value = ''
  addPreview.value = null
  addPreviewUrl.value = ''
  showAdd.value = true
}

function closeAddPublication() {
  showAdd.value = false
  addError.value = ''
  addBusy.value = false
  addPreview.value = null
  addPreviewUrl.value = ''
}

async function handleRefreshPublication(publication) {
  if (!publication.subscriptionId) return
  try {
    const result = await refreshFeed(publication.subscriptionId)
    await loadCloudLibrary()
    showToast(`${result.articlesCreated || 0} stories refreshed.`)
  } catch (error) {
    showToast(userMessageForFeedError(error), { force: true })
  }
}

async function handleRemovePublication(publication) {
  if (!publication.subscriptionId) return
  try {
    await removeSubscription(publication.subscriptionId)
    await loadCloudLibrary()
    selectedPublication.value = 'All publications'
    if (selectedArticle.value?.feedId === publication.feedId) closeArticle()
    showToast('Publication removed from cloud sync.')
  } catch (error) {
    showToast(userMessageForFeedError(error), { force: true })
  }
}

function toggleFocusMode() {
  if (!selectedArticle.value) return
  focusMode.value = !focusMode.value
}

function stepFontSize(direction) {
  const order = ['small', 'medium', 'large']
  const index = order.indexOf(settings.value.fontSize)
  const nextIndex = Math.min(order.length - 1, Math.max(0, index + direction))
  updateSetting('fontSize', order[nextIndex])
}

function openSettings() {
  showSettings.value = true
  nextTick(() => settingsPanel.value?.focusCloseButton())
}

function closeSettings() {
  showSettings.value = false
  nextTick(() => sidebar.value?.focusSettingsButton())
}

function openSignIn() {
  showSettings.value = false
  closeDrawerOnMobile()
  router.push({ path: '/auth', query: { redirect: '/app' } })
}

async function handleSignOut() {
  if (accountBusy.value || isSigningOut.value) return
  closeDrawerOnMobile()
  accountBusy.value = true
  accountError.value = ''
  accountMessage.value = ''
  const response = await signOut()
  accountBusy.value = false

  if (response.error) {
    accountError.value = response.error.message
    showToast(response.error.message, { force: true })
    return
  }

  accountMessage.value = 'Signed out successfully.'
  showSettings.value = false
  await router.replace('/app')
  showToast(accountMessage.value)
}

async function handleProfileUpdate(displayName) {
  if (!user.value || accountBusy.value) return
  accountBusy.value = true
  accountError.value = ''
  accountMessage.value = ''
  const response = await updateProfile(user.value.id, { displayName })
  accountBusy.value = false

  if (response.error) {
    accountError.value = response.error.message
    return
  }

  profile.value = response.data
  accountMessage.value = 'Display name updated.'
}

async function handlePasswordChange(password) {
  if (accountBusy.value) return
  accountBusy.value = true
  accountError.value = ''
  accountMessage.value = ''
  const response = await updatePassword(password)
  accountBusy.value = false

  if (response.error) {
    accountError.value = response.error.message
    return
  }

  accountMessage.value = 'Password updated securely.'
}

async function handleRetrySync() {
  if (accountBusy.value) return
  accountBusy.value = true
  accountError.value = ''
  accountMessage.value = ''
  await retrySync()
  accountBusy.value = false

  if (cloudError.value) accountError.value = cloudError.value
  else accountMessage.value = 'Cloud sync is up to date.'
}

async function handleImportOpml(feeds) {
  if (accountBusy.value) return
  accountBusy.value = true
  accountError.value = ''
  accountMessage.value = ''

  try {
    const result = await importOpml(feeds)
    await loadCloudLibrary()
    accountMessage.value = `${result.imported} imported, ${result.skipped} skipped, ${result.failed} failed.`
    showToast('OPML import finished.', { force: true })
  } catch (error) {
    accountError.value = userMessageForFeedError(error)
  } finally {
    accountBusy.value = false
  }
}

async function handleExportOpml() {
  if (accountBusy.value) return
  accountBusy.value = true
  accountError.value = ''

  try {
    const xml = await exportOpml()
    const blob = new Blob([xml], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'leafreader-subscriptions.opml'
    link.click()
    URL.revokeObjectURL(url)
    accountMessage.value = 'OPML export downloaded.'
  } catch (error) {
    accountError.value = userMessageForFeedError(error)
  } finally {
    accountBusy.value = false
  }
}

async function handleDeleteAccount(confirmation) {
  if (accountBusy.value) return
  accountBusy.value = true
  accountError.value = ''
  accountMessage.value = ''

  try {
    await deleteAccount(confirmation)
    await signOut()
    showSettings.value = false
    await router.replace('/app')
    showToast('Account deleted. Guest reading remains available.', { force: true })
  } catch (error) {
    accountError.value = userMessageForFeedError(error)
  } finally {
    accountBusy.value = false
  }
}

async function handleMigration() {
  if (migrationBusy.value) return
  migrationBusy.value = true
  await migrateLocalData()
  migrationBusy.value = false

  if (syncState.value === 'synced') {
    showToast('Your reading preferences were added to your account.', { force: true })
  } else if (cloudError.value) {
    showToast(cloudError.value, { force: true })
  }
}

function handleKeepLocalOnly() {
  keepLocalOnly()
  showToast('This browser will keep using its local reading space.', { force: true })
}

function clearReadingHistory() {
  articles.value.forEach((article) => { article.read = false })
  showToast('Reading history cleared.')
}

function clearSavedStories() {
  articles.value.forEach((article) => { article.saved = false })
  showToast('Saved stories cleared.')
}

function removeAddedPublications() {
  const removedNames = new Set(userPublications.value.map((publication) => publication.name))
  publications.value = initialPublications.map((publication) => ({ ...publication }))
  articles.value = articles.value.filter((article) => !article.isUserAdded || !removedNames.has(article.publication))
  if (removedNames.has(selectedPublication.value)) selectedPublication.value = 'All publications'
  if (selectedArticle.value && removedNames.has(selectedArticle.value.publication)) closeArticle()
  showToast('Added publications removed.')
}

function restoreDefaultSettings() {
  settings.value = { ...DEFAULT_SETTINGS }
  if (isDesktopViewport()) sidebarOpen.value = !settings.value.sidebarCollapsed
  showToast('Default settings restored.')
}

function clearAllLocalData() {
  suppressNextPersist = true
  clearLeafReaderState()
  settings.value = { ...DEFAULT_SETTINGS }
  publications.value = initialPublications.map((publication) => ({ ...publication }))
  articles.value = createInitialArticles()
  view.value = 'All Stories'
  query.value = ''
  selectedPublication.value = 'All publications'
  selectedCollection.value = 'Morning pages'
  selectedArticle.value = null
  focusMode.value = false
  showAdd.value = false
  addError.value = ''
  if (isDesktopViewport()) sidebarOpen.value = true
  showToast('All local data cleared.', { force: true })
  nextTick(() => {
    suppressNextPersist = false
    clearLeafReaderState()
  })
}

function browseAllStories() {
  query.value = ''
  selectedPublication.value = 'All publications'
  selectedCollection.value = 'Morning pages'
  view.value = 'All Stories'
}

const readIds = computed(() => articles.value.filter((article) => article.read).map((article) => article.id))
const savedIds = computed(() => articles.value.filter((article) => article.saved).map((article) => article.id))
const storageSignature = computed(() => JSON.stringify({
  settings: settings.value,
  articleState: {
    readIds: readIds.value,
    savedIds: savedIds.value,
  },
  userPublications: userPublications.value,
}))

function handleEscape(event) {
  if (event.key !== 'Escape') return
  if (showSettings.value) {
    closeSettings()
    return
  }
  if (showAdd.value) closeAddPublication()
  else if (focusMode.value) focusMode.value = false
  else if (typeof window !== 'undefined' && window.innerWidth <= 900 && sidebarOpen.value) sidebarOpen.value = false
}

watch([showAdd, showSettings, sidebarOpen, migrationPromptOpen], () => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  const lockForModal = showAdd.value || showSettings.value || migrationPromptOpen.value
  const lockForDrawer = sidebarOpen.value && window.innerWidth <= 900
  document.body.classList.toggle('scroll-locked', lockForModal || lockForDrawer)
})

watch(storageSignature, () => {
  if (suppressNextPersist) return
  saveLeafReaderState({
    settings: settings.value,
    articleState: {
      readIds: readIds.value,
      savedIds: savedIds.value,
    },
    userPublications: userPublications.value,
  })
}, { immediate: true })

watch(isAuthenticated, (authenticated) => {
  if (authenticated) {
    loadCloudLibrary()
  } else {
    publications.value = [
      ...initialPublications.map((publication) => ({ ...publication })),
      ...storedState.userPublications,
    ]
    articles.value = hydrateArticles()
  }
}, { immediate: true })

onMounted(() => {
  window.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEscape)
  window.clearTimeout(toastTimer)
})
</script>

<template>
  <main
    class="app-shell"
    :class="shellClasses"
    :style="appStyles"
    :data-motion="settings.motion"
    :data-reader-background="settings.readingBackground"
  >
    <button
      v-if="sidebarOpen"
      class="drawer-backdrop"
      type="button"
      aria-label="Close navigation"
      @click="setSidebarOpen(false)"
    ></button>

    <Sidebar
      ref="sidebar"
      :open="sidebarOpen"
      :view="view"
      :unread="unread"
      :publications="publications"
      :selected-publication="selectedPublication"
      :selected-collection="selectedCollection"
      :user="user"
      :authenticated="isAuthenticated"
      :auth-loading="isAuthLoading"
      :account-label="accountLabel"
      :cloud-status="cloudStatusLabel"
      :account-busy="accountBusy || isSigningOut"
      @toggle="toggleSidebar"
      @select-view="setView"
      @select-collection="setCollection"
      @select-publication="togglePublication"
      @refresh-publication="handleRefreshPublication"
      @remove-publication="handleRemovePublication"
      @open-add-publication="openAddPublication"
      @open-settings="openSettings"
      @sign-in="openSignIn"
      @sign-out="handleSignOut"
    />

    <section class="library" aria-label="Story list">
      <TopBar
        :page-title="pageTitle"
        :page-summary="pageSummary"
        :user-label="accountLabel"
        :authenticated="isAuthenticated"
        :cloud-status="cloudStatusLabel"
        :account-busy="accountBusy || isSigningOut"
        @open-navigation="setSidebarOpen(true)"
        @open-add-publication="openAddPublication"
        @open-settings="openSettings"
        @sign-out="handleSignOut"
      />

      <div class="library-head">
        <div>
          <p class="eyebrow">A quiet place for curious minds</p>
          <h1>{{ view === 'Saved' ? 'Saved for a slower day.' : 'Good morning, ' + greetingName + '.' }}</h1>
          <p class="subhead">{{ view === 'Saved' ? 'A small shelf of ideas you wanted to keep close.' : 'You have ' + unread + ' fresh stories waiting among the leaves.' }}</p>
        </div>
        <div class="today-card">
          <span>MONDAY</span>
          <strong>20</strong>
          <em>JULY · 2026</em>
        </div>
      </div>

      <StoryList
        :articles="filteredArticles"
        :unread="filteredUnread"
        :catalog-title="catalogTitle"
        :catalog-note="catalogNote"
        :catalog-summary="catalogSummary"
        :empty-title="emptyTitle"
        :empty-description="emptyDescription"
        :query="query"
        :selected-publication="selectedPublication"
        :selected-article-id="selectedArticle?.id"
        :card-view="cardView"
        :show-excerpts="settings.showExcerpts"
        @update:query="query = $event"
        @update:card-view="cardView = $event"
        @clear-publication="clearPublication"
        @mark-all-read="markAllRead"
        @open-article="openArticle"
        @toggle-saved="toggleSaved"
        @browse-all="browseAllStories"
      />
    </section>

    <ReaderPane
      ref="readerPane"
      :article="selectedArticle"
      :focus-mode="focusMode"
      :font-size="readerFontSize"
      :original-target="originalTarget"
      :original-rel="originalRel"
      @close="closeArticle"
      @step-font-size="stepFontSize"
      @toggle-read="toggleRead"
      @toggle-saved="toggleSaved"
      @toggle-focus="toggleFocusMode"
    />

    <AddPublicationModal
      v-if="showAdd"
      :model-value="newPublication"
      :error="addError"
      :busy="addBusy"
      :preview="addPreview"
      :authenticated="isAuthenticated"
      @update:model-value="newPublication = $event"
      @clear-error="addError = ''"
      @close="closeAddPublication"
      @submit="addPublication"
    />

    <SettingsPanel
      v-if="showSettings"
      ref="settingsPanel"
      :settings="settings"
      :storage-key="STORAGE_KEY"
      :added-publications-count="userPublications.length"
      :user="user"
      :profile="profile"
      :cloud-status="cloudStatusLabel"
      :cloud-state="syncState"
      :cloud-configured="isSupabaseConfigured"
      :account-busy="accountBusy"
      :account-message="accountMessage"
      :account-error="accountError"
      @close="closeSettings"
      @update-setting="updateSettingFromPanel"
      @clear-reading-history="clearReadingHistory"
      @clear-saved-stories="clearSavedStories"
      @remove-added-publications="removeAddedPublications"
      @restore-default-settings="restoreDefaultSettings"
      @clear-all-local-data="clearAllLocalData"
      @sign-in="openSignIn"
      @sign-out="handleSignOut"
      @update-profile="handleProfileUpdate"
      @change-password="handlePasswordChange"
      @retry-sync="handleRetrySync"
      @import-opml="handleImportOpml"
      @export-opml="handleExportOpml"
      @delete-account="handleDeleteAccount"
    />

    <CloudMigrationDialog
      v-if="migrationPromptOpen"
      :publications="migrationSummary.publications"
      :collections="migrationSummary.collections"
      :busy="migrationBusy"
      @keep-local="handleKeepLocalOnly"
      @migrate="handleMigration"
    />

    <Toast :message="toast" />
  </main>
</template>
