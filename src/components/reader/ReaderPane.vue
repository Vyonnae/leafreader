<script setup>
import { computed, nextTick, ref, watch } from 'vue'

const props = defineProps({
  article: {
    type: Object,
    default: null,
  },
  content: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
  focusMode: {
    type: Boolean,
    default: false,
  },
  fontSize: {
    type: Number,
    required: true,
  },
  readingWidth: {
    type: String,
    default: 'comfortable',
  },
  readingTheme: {
    type: String,
    default: 'light',
  },
  aiSummary: {
    type: Object,
    default: null,
  },
  aiLoading: {
    type: Boolean,
    default: false,
  },
  initialProgress: {
    type: Number,
    default: 0,
  },
  originalTarget: {
    type: String,
    default: null,
  },
  originalRel: {
    type: String,
    default: null,
  },
})

const emit = defineEmits([
  'close',
  'step-font-size',
  'set-reading-width',
  'set-reading-theme',
  'toggle-read',
  'toggle-saved',
  'toggle-focus',
  'update-progress',
  'add-tag',
  'remove-tag',
  'summarize',
])

const scrollArea = ref(null)
const progress = ref(0)

const displayContent = computed(() => props.content || props.article?.content || props.article?.contentHtml || '')
const author = computed(() => props.article?.byline || props.article?.author || 'Unknown author')
const sourceLine = computed(() => [props.article?.publication, props.article?.time].filter(Boolean).join(' / '))
const publishedLabel = computed(() => {
  if (!props.article?.publishedAt) return 'Publication date unavailable'
  const date = new Date(props.article.publishedAt)
  if (Number.isNaN(date.getTime())) return 'Publication date unavailable'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
})

function updateProgress() {
  const pane = scrollArea.value
  if (!pane) return
  const maxScroll = pane.scrollHeight - pane.clientHeight
  progress.value = maxScroll > 0 ? Math.min(100, Math.max(0, (pane.scrollTop / maxScroll) * 100)) : 0
  emit('update-progress', progress.value)
}

async function resetScroll() {
  await nextTick()
  if (scrollArea.value) {
    const maxScroll = scrollArea.value.scrollHeight - scrollArea.value.clientHeight
    scrollArea.value.scrollTop = maxScroll > 0 ? (maxScroll * Math.min(100, Math.max(0, props.initialProgress))) / 100 : 0
  }
  updateProgress()
}

watch(() => props.article?.id, resetScroll)
watch(() => props.content, () => nextTick(updateProgress))

defineExpose({ resetScroll })
</script>

<template>
  <section class="reader" :class="{ empty: !article, 'is-dark': readingTheme === 'dark', 'is-sepia': readingTheme === 'sepia' }" aria-label="Reader pane">
    <template v-if="article">
      <header class="reader-bar">
        <button class="reader-back" type="button" aria-label="Back to library" @click="emit('close')">
          <span aria-hidden="true">&larr;</span><span>Back</span>
        </button>
        <div class="reader-source">{{ sourceLine }}</div>
        <div class="reader-tools">
          <button type="button" aria-label="Decrease font size" @click="emit('step-font-size', -1)">A-</button>
          <button type="button" aria-label="Increase font size" @click="emit('step-font-size', 1)">A+</button>
          <button
            v-for="option in ['narrow', 'comfortable', 'wide']"
            :key="option"
            type="button"
            :class="{ active: readingWidth === option }"
            :aria-pressed="readingWidth === option"
            @click="emit('set-reading-width', option)"
          >
            {{ option === 'narrow' ? 'Compact' : option === 'wide' ? 'Wide' : 'Normal' }}
          </button>
          <button
            v-for="theme in ['light', 'sepia', 'dark']"
            :key="theme"
            type="button"
            :class="{ active: readingTheme === theme }"
            :aria-pressed="readingTheme === theme"
            @click="emit('set-reading-theme', theme)"
          >
            {{ theme[0].toUpperCase() + theme.slice(1) }}
          </button>
          <button type="button" @click="emit('toggle-read', article)">{{ article.read ? 'Read' : 'Unread' }}</button>
          <button type="button" :class="{ active: article.saved }" @click="emit('toggle-saved', article)">{{ article.saved ? 'Saved' : 'Save' }}</button>
          <button type="button" :class="{ active: focusMode }" @click="emit('toggle-focus')">{{ focusMode ? 'Exit focus' : 'Focus' }}</button>
        </div>
      </header>
      <div class="progress" aria-label="Reading progress">
        <span :style="{ width: progress + '%' }"></span>
      </div>
      <div ref="scrollArea" class="reader-scroll" @scroll="updateProgress">
        <article class="reading-page">
          <p class="reader-kicker">{{ article.category }}</p>
          <p class="reader-meta">{{ article.publication }} / {{ publishedLabel }} / {{ article.readingTime || article.time }}</p>
          <h1>{{ article.title }}</h1>
          <p class="byline">
            <span>{{ author }}</span>
            <span aria-hidden="true"> / </span>
            <strong>{{ article.publication }}</strong>
          </p>

          <div class="reader-tags" aria-label="Article tags">
            <span v-for="tag in article.tags || []" :key="tag">
              {{ tag }}
              <button type="button" :aria-label="'Remove tag ' + tag" @click="emit('remove-tag', { article, tag })">x</button>
            </span>
            <form @submit.prevent="emit('add-tag', { article, tag: $event.target.elements.tag.value }); $event.target.reset()">
              <input name="tag" type="text" placeholder="Add tag" aria-label="Add tag" />
            </form>
          </div>

          <figure v-if="article.image">
            <img :src="article.image" :alt="article.title" />
            <figcaption>{{ article.publication }}</figcaption>
          </figure>

          <div v-if="loading" class="reader-status">
            <span class="reader-spinner" aria-hidden="true"></span>
            <p>正在获取文章内容...</p>
          </div>

          <div v-else-if="error" class="reader-status reader-error">
            <h2>无法获取全文</h2>
            <p>{{ error }}</p>
            <a
              v-if="article.originalUrl"
              class="reader-original"
              :href="article.originalUrl"
              :target="originalTarget"
              :rel="originalRel"
            >
              查看原文
            </a>
          </div>

          <div v-else class="article-body" :style="{ fontSize: fontSize + 'px' }" v-html="displayContent"></div>

          <aside class="ai-summary" aria-label="AI Summary">
            <div>
              <h2>AI Summary</h2>
              <button type="button" :disabled="aiLoading" @click="emit('summarize', article)">{{ aiLoading ? 'Summarizing...' : 'Generate' }}</button>
            </div>
            <p v-if="!aiSummary">AI服务未配置</p>
            <template v-else>
              <p>{{ aiSummary.summary }}</p>
              <ul v-if="aiSummary.keyPoints?.length">
                <li v-for="point in aiSummary.keyPoints" :key="point">{{ point }}</li>
              </ul>
              <div v-if="aiSummary.keywords?.length" class="ai-keywords">
                <span v-for="keyword in aiSummary.keywords" :key="keyword">{{ keyword }}</span>
              </div>
            </template>
          </aside>

          <footer class="reader-actions">
            <button type="button" :class="{ active: article.saved }" @click="emit('toggle-saved', article)">
              {{ article.saved ? 'Saved' : 'Save' }}
            </button>
            <button type="button" @click="emit('toggle-read', article)">
              {{ article.read ? 'Mark unread' : 'Mark read' }}
            </button>
            <a
              v-if="article.originalUrl"
              class="reader-original"
              :href="article.originalUrl"
              :target="originalTarget"
              :rel="originalRel"
            >
              Open original
            </a>
          </footer>
        </article>
      </div>
    </template>
    <div v-else class="reader-empty-state">
      <span aria-hidden="true">LR</span>
      <h2>Select a story to begin reading.</h2>
      <p>Choose something from your reading list and enjoy a quieter reading experience.</p>
    </div>
  </section>
</template>
