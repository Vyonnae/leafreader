<script setup>
import { computed, ref, watch } from 'vue'
import StoryCard from './StoryCard.vue'

const props = defineProps({
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
  selectedTag: {
    type: String,
    default: '',
  },
  statusFilter: {
    type: String,
    default: 'all',
  },
  dateFilter: {
    type: String,
    default: 'all',
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
  'update:status-filter',
  'update:date-filter',
  'clear-tag',
  'clear-publication',
  'mark-all-read',
  'open-article',
  'toggle-saved',
  'browse-all',
])

const visibleCount = ref(60)
const visibleArticles = computed(() => props.articles.slice(0, visibleCount.value))
const hasMoreArticles = computed(() => visibleCount.value < props.articles.length)

watch(() => props.articles, () => {
  visibleCount.value = 60
})

function showMoreArticles() {
  visibleCount.value = Math.min(props.articles.length, visibleCount.value + 60)
}
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
        <button v-if="selectedTag" type="button" class="read-all" @click="emit('clear-tag')">Tag: {{ selectedTag }} x</button>
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
      <div class="search-filters" role="group" aria-label="Search filters">
        <label>
          <span>Status</span>
          <select :value="statusFilter" @change="emit('update:status-filter', $event.target.value)">
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="saved">Saved</option>
            <option value="read">Read</option>
          </select>
        </label>
        <label>
          <span>Date</span>
          <select :value="dateFilter" @change="emit('update:date-filter', $event.target.value)">
            <option value="all">Any time</option>
            <option value="today">Today</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </label>
      </div>
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
        v-for="article in visibleArticles"
        :key="article.id"
        :article="article"
        :selected="selectedArticleId === article.id"
        :show-excerpt="showExcerpts"
        @open="emit('open-article', $event)"
        @toggle-saved="emit('toggle-saved', $event)"
      />
    </div>
    <button v-if="hasMoreArticles" class="load-more-stories" type="button" @click="showMoreArticles">
      Load more stories
    </button>

    <div v-if="!articles.length" class="empty-state">
      <span aria-hidden="true">⌕</span>
      <h2>{{ emptyTitle }}</h2>
      <p>{{ emptyDescription }}</p>
      <button type="button" @click="emit('browse-all')">Browse all stories</button>
    </div>
  </div>
</template>
