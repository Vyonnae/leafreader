<script setup>
import { nextTick, ref, watch } from 'vue'

const props = defineProps({
  article: {
    type: Object,
    default: null,
  },
  focusMode: {
    type: Boolean,
    default: false,
  },
  fontSize: {
    type: Number,
    required: true,
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
  'toggle-read',
  'toggle-saved',
  'toggle-focus',
])

const scrollArea = ref(null)
const progress = ref(0)

function updateProgress() {
  const pane = scrollArea.value
  if (!pane) return
  const maxScroll = pane.scrollHeight - pane.clientHeight
  progress.value = maxScroll > 0 ? Math.min(100, Math.max(0, (pane.scrollTop / maxScroll) * 100)) : 0
}

async function resetScroll() {
  await nextTick()
  if (scrollArea.value) scrollArea.value.scrollTop = 0
  updateProgress()
}

watch(() => props.article?.id, resetScroll)

defineExpose({ resetScroll })
</script>

<template>
  <section class="reader" :class="{ empty: !article }" aria-label="Reader pane">
    <template v-if="article">
      <header class="reader-bar">
        <button class="reader-back" type="button" aria-label="Back to library" @click="emit('close')">← <span>Back to library</span></button>
        <div class="reader-source">{{ article.publication }} <i aria-hidden="true"></i> {{ article.time }}</div>
        <div class="reader-tools">
          <button type="button" aria-label="Decrease font size" @click="emit('step-font-size', -1)">A−</button>
          <button type="button" aria-label="Increase font size" @click="emit('step-font-size', 1)">A+</button>
          <button type="button" @click="emit('toggle-read', article)">{{ article.read ? 'Read' : 'Unread' }}</button>
          <button type="button" :class="{ active: article.saved }" @click="emit('toggle-saved', article)">{{ article.saved ? '♥ Saved' : '♡ Save' }}</button>
          <button type="button" :class="{ active: focusMode }" @click="emit('toggle-focus')">{{ focusMode ? 'Exit focus' : 'Focus' }}</button>
          <a
            v-if="article.originalUrl"
            class="reader-original"
            :href="article.originalUrl"
            :target="originalTarget"
            :rel="originalRel"
          >
            Original
          </a>
        </div>
      </header>
      <div class="progress"><span :style="{ width: progress + '%' }"></span></div>
      <div ref="scrollArea" class="reader-scroll" @scroll="updateProgress">
        <article class="reading-page">
          <p class="reader-kicker">{{ article.category }}</p>
          <p class="reader-meta">{{ article.publication }} · Today · {{ article.time }}</p>
          <h1>{{ article.title }}</h1>
          <p class="byline">A selection from <strong>{{ article.publication }}</strong> for a quieter reading hour.</p>
          <figure>
            <img :src="article.image" :alt="article.title" />
            <figcaption>{{ article.publication }} field notes, gathered for LeafReader.</figcaption>
          </figure>
          <div class="article-body" :style="{ fontSize: fontSize + 'px' }">
            <p>{{ article.excerpt }}</p>
            <p>There is a kind of attention that returns us to ourselves. It is not loud, and it makes no demand for improvement. It simply asks us to notice the ordinary textures of a day: the leaf on the pavement, the margin beside a sentence, the unhurried warmth of a cup held in both hands.</p>
            <blockquote>To read well is to keep a small room open inside the day.</blockquote>
            <h2>A slower margin</h2>
            <p>Good reading spaces know when to disappear. They hold the line length, soften the edges and let the title, source and body settle into a rhythm that feels deliberate rather than managed.</p>
            <ul>
              <li>Keep the first sentence close enough to invite continuation.</li>
              <li>Let images behave like quiet pauses, not loud interruptions.</li>
              <li>Use small states and restrained controls to protect the page.</li>
            </ul>
            <p>To read well is to make space for this attention. We turn the page not to finish a task, but to dwell a little longer inside another way of seeing.</p>
            <pre><code>const readingMode = 'quiet'
const pageWidth = 'comfortable'</code></pre>
            <hr>
            <p><a href="#" @click.prevent>Return to this thought later</a> when the page has had time to settle.</p>
          </div>
        </article>
      </div>
    </template>
    <div v-else class="reader-empty-state">
      <span aria-hidden="true">⌁</span>
      <h2>Select a story to begin reading.</h2>
      <p>Choose something from your reading list and enjoy a quieter reading experience.</p>
    </div>
  </section>
</template>
