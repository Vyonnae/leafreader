<script setup>
const props = defineProps({
  article: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
  showExcerpt: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['open', 'toggle-saved'])

function openStory() {
  emit('open', props.article)
}
</script>

<template>
  <article
    class="story-card"
    :class="[
      { unread: !article.read, 'is-read': article.read, 'is-selected': selected },
      article.hue,
    ]"
    role="button"
    tabindex="0"
    :aria-label="`Open story: ${article.title}`"
    @click="openStory"
    @keydown.enter.prevent="openStory"
    @keydown.space.prevent="openStory"
  >
    <div class="story-copy">
      <div class="story-meta">
        <span class="publication-dot">{{ article.publication.slice(0, 1) }}</span>
        <span class="publication-name">{{ article.publication }}</span>
        <i aria-hidden="true"></i>
        <span class="time">{{ article.time }}</span>
      </div>
      <h2>{{ article.title }}</h2>
      <p v-if="showExcerpt" class="story-excerpt">{{ article.excerpt }}</p>
      <div v-if="article.tags?.length" class="story-tags" aria-label="Article tags">
        <span v-for="tag in article.tags.slice(0, 4)" :key="tag">{{ tag }}</span>
      </div>
      <div class="story-footer">
        <span class="category-tag">{{ article.category }}</span>
        <span v-if="!article.read" class="unread-dot">Unread</span>
        <span v-else class="read-state">Read</span>
        <span class="read-link">Read story <b>→</b></span>
        <button
          class="save-button"
          type="button"
          :class="{ 'is-saved': article.saved }"
          :aria-label="article.saved ? 'Unsave story' : 'Save story'"
          @click.stop="emit('toggle-saved', article)"
          @keydown.space.stop
        >
          {{ article.saved ? '♥' : '♡' }}
        </button>
      </div>
    </div>
    <div class="image-wrap"><img :src="article.image" :alt="article.title" loading="lazy" decoding="async" /></div>
  </article>
</template>
