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
import { summarizeArticle } from './services/aiService'
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
const selectedTag = ref('')
const tagQuery = ref('')
const statusFilter = ref('all')
const dateFilter = ref('all')
const selectedArticle = ref(null)
const showAdd = ref(false)
const showSettings = ref(false)
const newPublication = ref('')
const focusMode = ref(false)
const readerPane = ref(null)
const settingsPanel = ref(null)
const sidebar = ref(null)
const readerLoading = ref(false)
const readerError = ref('')
const aiSummaries = ref({})
const aiLoading = ref(false)
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
let articleRequestToken = 0

const storedState = loadLeafReaderState()
const storedReadIds = new Set(storedState.articleState.readIds)
const storedSavedIds = new Set(storedState.articleState.savedIds)
const storedArticleMeta = storedState.articleMeta || {}
const articleHistory = ref(storedState.articleHistory || [])
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

function createArticleContent(paragraphs, options = {}) {
  const body = paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('')
  const quote = options.quote ? `<blockquote>${options.quote}</blockquote>` : ''
  const list = options.items?.length
    ? `<ul>${options.items.map((item) => `<li>${item}</li>`).join('')}</ul>`
    : ''
  const code = options.code ? `<pre><code>${options.code}</code></pre>` : ''
  return `${body}${quote}${options.heading ? `<h2>${options.heading}</h2>` : ''}${list}${code}`
}

function createInitialArticles() {
  return [
    { id: 1, publication: 'The Gentle Journal', feed: 'The Gentle Journal', category: 'SLOW LIVING', time: '12 min read', title: 'The small, luminous rituals that make a day feel like your own', excerpt: 'A notebook opened before the inbox, the clear taste of early tea, and the gentle discipline of leaving a little room for wonder.', content: createArticleContent(['A notebook opened before the inbox, the clear taste of early tea, and the gentle discipline of leaving a little room for wonder.', 'There is a kind of attention that returns us to ourselves. It is not loud, and it makes no demand for improvement. It simply asks us to notice the ordinary textures of a day.', 'Good reading spaces know when to disappear. They hold the line length, soften the edges and let the title, source and body settle into a rhythm that feels deliberate rather than managed.'], { quote: 'To read well is to keep a small room open inside the day.', heading: 'A slower margin', items: ['Keep the first sentence close enough to invite continuation.', 'Let images behave like quiet pauses, not loud interruptions.', 'Use small states and restrained controls to protect the page.'], code: 'const readingMode = "quiet"\nconst pageWidth = "comfortable"' }), extractedContent: '', readingTime: '12 min read', lastReadAt: null, progress: 0, readingProgress: 0, tags: ['Design', 'Mindful'], image: articleImage('#e7f1ea', '#5f8d74', 'leaf'), originalUrl: 'https://example.com/leafreader/the-small-luminous-rituals', url: 'https://example.com/leafreader/the-small-luminous-rituals', collections: ['Morning pages', 'To ponder'], read: false, saved: true, hue: 'sage', createdAt: new Date().toISOString() },
    { id: 2, publication: 'Monocle', feed: 'Monocle', category: 'DESIGN NOTES', time: '8 min read', title: 'A field guide to the quiet confidence of good paper', excerpt: 'From the grain beneath your fingertips to the pause before a handwritten line, material details change how ideas arrive.', content: createArticleContent(['From the grain beneath your fingertips to the pause before a handwritten line, material details change how ideas arrive.', 'A good page gives structure without calling attention to itself. Weight, shade, grain and format all shape the mood of a note before the first word is written.', 'The best tools leave room for hesitation, revision and the small marks that make thinking visible.'], { heading: 'Paper as interface' }), extractedContent: '', readingTime: '8 min read', lastReadAt: null, progress: 0, readingProgress: 0, tags: ['Design', 'Frontend'], image: articleImage('#e7eef0', '#536d72', 'paper'), originalUrl: 'https://monocle.com/', url: 'https://monocle.com/', collections: ['Morning pages'], read: false, saved: false, hue: 'blue', createdAt: new Date().toISOString() },
    { id: 3, publication: 'Kinfolk', feed: 'Kinfolk', category: 'ON THE TABLE', time: '6 min read', title: 'The table is a place for unhurried conversations', excerpt: 'A few linen napkins, seasonal fruit and the permission to make an ordinary weekday feel considered.', content: createArticleContent(['A few linen napkins, seasonal fruit and the permission to make an ordinary weekday feel considered.', 'The table is less an object than a pace. It gathers plates, elbows, half-finished stories and the kind of silence that feels shared rather than empty.', 'When the meal ends, the room keeps a trace of the conversation: a folded corner, a glass ring, a sentence someone will remember tomorrow.'], { heading: 'What stays after dinner' }), extractedContent: '', readingTime: '6 min read', lastReadAt: null, progress: 0, readingProgress: 0, tags: ['Design'], image: articleImage('#f4ead6', '#756242', 'table'), originalUrl: 'https://www.kinfolk.com/', url: 'https://www.kinfolk.com/', collections: ['Morning pages'], read: true, saved: false, hue: 'sand', createdAt: new Date().toISOString() },
    { id: 4, publication: 'The Marginalian', feed: 'The Marginalian', category: 'IDEAS', time: '10 min read', title: 'Reading is a form of living twice', excerpt: 'Books carry us into a conversation much larger than the one we happen to be having with ourselves today.', content: createArticleContent(['Books carry us into a conversation much larger than the one we happen to be having with ourselves today.', 'To read is to borrow another cadence for a while, then return to the room with a slightly altered sense of what the room contains.', 'A sentence can wait years before it finds the hour in which it becomes useful. LeafReader keeps that hour close.'], { quote: 'Every serious reading life is also a record of attention.', heading: 'The second life of a sentence' }), extractedContent: '', readingTime: '10 min read', lastReadAt: null, progress: 0, readingProgress: 0, tags: ['AI', 'Mindful'], image: articleImage('#f4e8df', '#7b5f51', 'books'), originalUrl: 'https://www.themarginalian.org/', url: 'https://www.themarginalian.org/', collections: ['Morning pages', 'To ponder'], read: false, saved: true, hue: 'peach', createdAt: new Date().toISOString() },
  ]
}

function hydrateArticles() {
  return dedupeArticles(createInitialArticles().map((article) => ({
    ...article,
    ...(storedArticleMeta[article.id] || {}),
    sourceType: 'demo',
    read: storedState.hasStoredState ? storedReadIds.has(article.id) : article.read,
    saved: storedState.hasStoredState ? storedSavedIds.has(article.id) : article.saved,
    readingProgress: storedArticleMeta[article.id]?.readingProgress || article.readingProgress || article.progress || 0,
    progress: storedArticleMeta[article.id]?.readingProgress || article.progress || 0,
  })))
}

function dedupeArticles(items) {
  const seen = new Set()
  return items.filter((article) => {
    const key = String(article.url || article.originalUrl || article.id || '').toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
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
  '--leaf-reader-surface': settings.value.readingTheme === 'sepia' || settings.value.readingBackground === 'paper' ? '#f6f0e4' : 'var(--leaf-color-card)',
  '--leaf-reader-shell': settings.value.readingTheme === 'sepia' || settings.value.readingBackground === 'paper' ? '#fbf5ea' : 'var(--leaf-color-paper-warm)',
}))

const originalTarget = computed(() => settings.value.openOriginalInNewTab ? '_blank' : null)
const originalRel = computed(() => settings.value.openOriginalInNewTab ? 'noopener noreferrer' : null)
const userPublications = computed(() => publications.value.filter((publication) => publication.isUserAdded && publication.sourceType !== 'cloud'))
const selectedArticleContent = computed(() => {
  const article = selectedArticle.value
  if (!article) return ''
  return article.content || article.extractedContent || article.contentHtml || (article.excerpt ? `<p>${escapeHtml(article.excerpt)}</p>` : '')
})
const historyArticleIds = computed(() => new Set(articleHistory.value.map((entry) => entry.articleId)))
const taggedArticles = computed(() => articles.value.filter((article) => article.tags?.length))
const tagStats = computed(() => {
  const term = tagQuery.value.trim().toLowerCase()
  const counts = new Map()
  articles.value.forEach((article) => {
    ;(article.tags || []).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1))
  })
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .filter((tag) => !term || tag.name.toLowerCase().includes(term))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
})
const historyGroups = computed(() => {
  const byId = new Map(articles.value.map((article) => [article.id, article]))
  const groups = { Today: [], Yesterday: [], 'Last Week': [] }
  articleHistory.value.forEach((entry) => {
    const article = byId.get(entry.articleId)
    if (!article) return
    const bucket = historyBucket(entry.readAt)
    if (bucket) groups[bucket].push({ ...entry, article })
  })
  return Object.entries(groups)
    .map(([label, entries]) => ({ label, entries }))
    .filter((group) => group.entries.length)
})

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

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
  const matchesHistory = view.value === 'History' ? historyArticleIds.value.has(article.id) : true
  const matchesCollection = !selectedCollection.value || article.collections?.includes(selectedCollection.value)
  const matchesPublication = selectedPublication.value === 'All publications' || article.publication === selectedPublication.value
  const matchesTag = !selectedTag.value || article.tags?.includes(selectedTag.value)
  const matchesStatus = statusFilter.value === 'all'
    || (statusFilter.value === 'unread' && !article.read)
    || (statusFilter.value === 'saved' && article.saved)
    || (statusFilter.value === 'read' && article.read)
  const matchesDate = dateFilter.value === 'all' || articleMatchesDate(article, dateFilter.value)
  const term = query.value.toLowerCase()
  const searchable = [
    article.title,
    article.excerpt,
    article.content,
    article.extractedContent,
    article.contentHtml,
    article.author,
    article.byline,
    article.publication,
    article.feed,
    ...(article.tags || []),
  ].join(' ').toLowerCase()
  const matchesQuery = !term || searchable.includes(term)
  return matchesView && matchesHistory && matchesCollection && matchesPublication && matchesTag && matchesStatus && matchesDate && matchesQuery
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

function selectTag(tag) {
  selectedTag.value = selectedTag.value === tag ? '' : tag
  view.value = 'All Stories'
  closeDrawerOnMobile()
}

function clearTag() {
  selectedTag.value = ''
}

function articleMatchesDate(article, range) {
  const value = article.publishedAt || article.createdAt || article.lastReadAt
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()
  const ageMs = now.getTime() - date.getTime()
  if (range === 'today') return date.toDateString() === now.toDateString()
  if (range === 'week') return ageMs <= 7 * 24 * 60 * 60 * 1000
  if (range === 'month') return ageMs <= 31 * 24 * 60 * 60 * 1000
  return true
}

function historyBucket(readAt) {
  const date = new Date(readAt)
  if (Number.isNaN(date.getTime())) return ''
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  if (today.getTime() - date.getTime() <= 7 * 24 * 60 * 60 * 1000) return 'Last Week'
  return ''
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
    feed: publication,
    category: 'RSS',
    time: `${article.reading_time || 1} min read`,
    title: article.title,
    excerpt: article.excerpt || '',
    image: article.image_url || articleImage('#e7f1ea', '#5f8d74', 'leaf'),
    originalUrl: article.url,
    url: article.url,
    collections: ['Morning pages'],
    read: Boolean(state?.is_read),
    saved: Boolean(state?.is_saved),
    hue: 'sage',
    content: article.content_html || '',
    extractedContent: '',
    contentHtml: article.content_html || '',
    author: article.author || '',
    publishedAt: article.published_at,
    readingTime: `${article.reading_time || 1} min read`,
    lastReadAt: state?.last_read_at || null,
    progress: Number(state?.progress || storedArticleMeta[article.id]?.readingProgress || 0),
    readingProgress: Number(state?.progress || storedArticleMeta[article.id]?.readingProgress || 0),
    tags: storedArticleMeta[article.id]?.tags || [],
    createdAt: article.created_at || article.published_at || new Date().toISOString(),
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
    articles.value = dedupeArticles(cloudArticles)
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
  article.lastReadAt = new Date().toISOString()
  recordArticleHistory(article)
  selectedArticle.value = article
  focusMode.value = settings.value.defaultFocusMode
  readerError.value = ''
  articleRequestToken += 1
  const requestToken = articleRequestToken
  await nextTick()
  await readerPane.value?.resetScroll()
  await ensureReadableContent(article, requestToken)
}

function closeArticle() {
  articleRequestToken += 1
  selectedArticle.value = null
  focusMode.value = false
  readerLoading.value = false
  readerError.value = ''
}

function hasReadableContent(article) {
  const html = article?.content || article?.extractedContent || article?.contentHtml || ''
  const paragraphCount = (html.match(/<p[\s>]/gi) || []).length
  const plainText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return plainText.length > Math.max(360, (article?.excerpt || '').length + 120) || paragraphCount >= 2
}

async function ensureReadableContent(article, requestToken) {
  if (!article || hasReadableContent(article)) {
    readerLoading.value = false
    return
  }

  if (!article.originalUrl) {
    readerError.value = 'This story does not include a source URL.'
    readerLoading.value = false
    return
  }

  readerLoading.value = true
  readerError.value = ''

  try {
    const response = await fetch('/api/extract-article', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ url: article.originalUrl }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.message || 'Unable to fetch the full article.')
    if (requestToken !== articleRequestToken || selectedArticle.value?.id !== article.id) return

    article.extractedContent = payload.content || ''
    article.content = article.content || payload.content || ''
    article.excerpt = article.excerpt || payload.excerpt || ''
    article.author = article.author || payload.author || payload.byline || ''
    article.byline = article.byline || payload.byline || payload.author || ''
    article.readingTime = payload.readingTime ? `${payload.readingTime} min read` : article.readingTime
    article.image = article.image || payload.image
  } catch (error) {
    if (requestToken !== articleRequestToken || selectedArticle.value?.id !== article.id) return
    readerError.value = error.message || 'Unable to fetch the full article.'
  } finally {
    if (requestToken === articleRequestToken) {
      readerLoading.value = false
      nextTick(() => readerPane.value?.resetScroll())
    }
  }
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

function setReadingWidth(width) {
  updateSetting('readingWidth', width)
}

function toggleReaderDarkMode() {
  updateSetting('readingTheme', settings.value.readingTheme === 'dark' ? 'light' : 'dark')
}

function setReadingTheme(theme) {
  updateSetting('readingTheme', theme)
}

function updateArticleProgress(value) {
  if (!selectedArticle.value) return
  const progress = Math.round(value)
  selectedArticle.value.progress = progress
  selectedArticle.value.readingProgress = progress
  const historyEntry = articleHistory.value.find((entry) => entry.articleId === selectedArticle.value.id)
  if (historyEntry) historyEntry.progress = progress
}

function recordArticleHistory(article) {
  articleHistory.value = [
    { articleId: article.id, readAt: article.lastReadAt, progress: article.readingProgress || article.progress || 0 },
    ...articleHistory.value.filter((entry) => entry.articleId !== article.id),
  ].slice(0, 200)
}

function addArticleTag({ article, tag }) {
  const normalized = String(tag || '').trim()
  if (!article || !normalized) return
  article.tags = Array.from(new Set([...(article.tags || []), normalized])).slice(0, 12)
}

function removeArticleTag({ article, tag }) {
  if (!article) return
  article.tags = (article.tags || []).filter((item) => item !== tag)
  if (selectedTag.value === tag && !articles.value.some((entry) => entry.tags?.includes(tag))) selectedTag.value = ''
}

async function summarizeSelectedArticle(article) {
  if (!article || aiLoading.value) return
  aiLoading.value = true
  try {
    aiSummaries.value = {
      ...aiSummaries.value,
      [article.id]: await summarizeArticle(article),
    }
  } catch (error) {
    aiSummaries.value = {
      ...aiSummaries.value,
      [article.id]: {
        summary: error.message || 'AI服务未配置',
        keyPoints: [],
        keywords: [],
      },
    }
  } finally {
    aiLoading.value = false
  }
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
  articles.value.forEach((article) => {
    article.progress = 0
    article.readingProgress = 0
    article.lastReadAt = null
  })
  articleHistory.value = []
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
const articleMeta = computed(() => articles.value.reduce((meta, article) => {
  meta[article.id] = {
    tags: article.tags || [],
    readingProgress: article.readingProgress || article.progress || 0,
    lastReadAt: article.lastReadAt || null,
  }
  return meta
}, {}))
const storageSignature = computed(() => JSON.stringify({
  settings: settings.value,
  articleState: {
    readIds: readIds.value,
    savedIds: savedIds.value,
  },
  articleHistory: articleHistory.value,
  articleMeta: articleMeta.value,
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
    articleHistory: articleHistory.value,
    articleMeta: articleMeta.value,
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
      :tag-stats="tagStats"
      :history-groups="historyGroups"
      :selected-tag="selectedTag"
      :tag-query="tagQuery"
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
      @select-tag="selectTag"
      @clear-tag="clearTag"
      @update:tag-query="tagQuery = $event"
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
        :selected-tag="selectedTag"
        :status-filter="statusFilter"
        :date-filter="dateFilter"
        :selected-article-id="selectedArticle?.id"
        :card-view="cardView"
        :show-excerpts="settings.showExcerpts"
        @update:query="query = $event"
        @update:card-view="cardView = $event"
        @update:status-filter="statusFilter = $event"
        @update:date-filter="dateFilter = $event"
        @clear-tag="clearTag"
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
      :content="selectedArticleContent"
      :loading="readerLoading"
      :error="readerError"
      :focus-mode="focusMode"
      :font-size="readerFontSize"
      :reading-width="settings.readingWidth"
      :reading-theme="settings.readingTheme"
      :ai-summary="selectedArticle ? aiSummaries[selectedArticle.id] : null"
      :ai-loading="aiLoading"
      :initial-progress="selectedArticle?.readingProgress || selectedArticle?.progress || 0"
      :original-target="originalTarget"
      :original-rel="originalRel"
      @close="closeArticle"
      @step-font-size="stepFontSize"
      @set-reading-width="setReadingWidth"
      @set-reading-theme="setReadingTheme"
      @toggle-read="toggleRead"
      @toggle-saved="toggleSaved"
      @toggle-focus="toggleFocusMode"
      @update-progress="updateArticleProgress"
      @add-tag="addArticleTag"
      @remove-tag="removeArticleTag"
      @summarize="summarizeSelectedArticle"
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
