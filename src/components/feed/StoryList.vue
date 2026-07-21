<script setup>
import StoryCard from './StoryCard.vue'

defineProps({
  articles: {
    type: Array,
    required: true,
  },
  unread: {
    type: Number,
    required: true,
  },
  catalogTitle: {
    type: String,
    required: true,
  },
  catalogNote: {
    type: String,
    required: true,
  },
  catalogSummary: {
    type: String,
    required: true,
  },
  emptyTitle: {
    type: String,
    required: true,
  },
  emptyDescription: {
    type: String,
    required: true,
  },
  query: {
    type: String,
    required: true,
  },
  selectedPublication: {
    type: String,
    required: true,
  },
  selectedArticleId: {
    type: [Number, String],
    default: null,
  },
  cardView: {
    type: Boolean,
    required: true,
  },
  showExcerpts: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits([
  'update:query',
  'update:card-view',
  'clear-publication',
  'mark-all-read',
  'open-article',
  'toggle-saved',
  'browse-all',
])
</script>

<template>
  <div class="catalog-panel">
    <div class="catalog-header">
      <div>
        <p class="catalog-kicker">READING CATALOG</p>
        <h2>{{ catalogTitle }}</h2>
        <p>{{ catalogNote }}</p>
      </div>
      <div class="catalog-stat">
        <strong>{{ articles.length }}</strong>
        <span>{{ unread }} unread</span>
      </div>
    </div>

    <div class="toolbar">
      <div class="filters">
        <button
          type="button"
          :class="{ picked: selectedPublication === 'All publications' }"
          @click="emit('clear-publication')"
        >
          All publications <span aria-hidden="true">⌄</span>
        </button>
        <button class="read-all" type="button" @click="emit('mark-all-read')">Mark all as read</button>
      </div>
      <label class="search-wrap">
        <span aria-hidden="true">⌕</span>
        <input
          :value="query"
          type="text"
          aria-label="Search stories, authors, or publications"
          placeholder="Search stories, authors, or publications..."
          @input="emit('update:query', $event.target.value)"
        />
        <button v-if="query" type="button" aria-label="Clear search" @click="emit('update:query', '')">×</button>
      </label>
      <div class="view-switch" role="group" aria-label="Layout switcher">
        <button
          type="button"
          :class="{ active: !cardView }"
          :aria-pressed="!cardView"
          aria-label="List view"
          @click="emit('update:card-view', false)"
        >
          <span aria-hidden="true">☷</span><span>List</span>
        </button>
        <button
          type="button"
          :class="{ active: cardView }"
          :aria-pressed="cardView"
          aria-label="Card view"
          @click="emit('update:card-view', true)"
        >
          <span aria-hidden="true">▦</span><span>Cards</span>
        </button>
      </div>
    </div>

    <div class="story-count"><span>{{ catalogSummary }}</span><i></i><span>{{ cardView ? 'CARD VIEW' : 'LIST VIEW' }}</span></div>
    <div class="article-list" :class="{ grid: cardView }">
      <StoryCard
        v-for="article in articles"
        :key="article.id"
        :article="article"
        :selected="selectedArticleId === article.id"
        :show-excerpt="showExcerpts"
        @open="emit('open-article', $event)"
        @toggle-saved="emit('toggle-saved', $event)"
      />
    </div>

    <div v-if="!articles.length" class="empty-state">
      <span aria-hidden="true">⌕</span>
      <h2>{{ emptyTitle }}</h2>
      <p>{{ emptyDescription }}</p>
      <button type="button" @click="emit('browse-all')">Browse all stories</button>
    </div>
  </div>
</template>
