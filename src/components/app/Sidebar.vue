<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
  view: {
    type: String,
    required: true,
  },
  unread: {
    type: Number,
    required: true,
  },
  publications: {
    type: Array,
    required: true,
  },
  tagStats: {
    type: Array,
    default: () => [],
  },
  historyGroups: {
    type: Array,
    default: () => [],
  },
  selectedTag: {
    type: String,
    default: '',
  },
  tagQuery: {
    type: String,
    default: '',
  },
  selectedPublication: {
    type: String,
    required: true,
  },
  selectedCollection: {
    type: String,
    default: 'Morning pages',
  },
  user: {
    type: Object,
    default: null,
  },
  authenticated: {
    type: Boolean,
    default: false,
  },
  authLoading: {
    type: Boolean,
    default: false,
  },
  accountLabel: {
    type: String,
    default: 'Guest Reader',
  },
  cloudStatus: {
    type: String,
    default: 'Local reading space',
  },
  accountBusy: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'toggle',
  'select-view',
  'select-collection',
  'select-publication',
  'select-tag',
  'clear-tag',
  'update:tag-query',
  'refresh-publication',
  'remove-publication',
  'open-add-publication',
  'open-settings',
  'sign-in',
  'sign-out',
])

const settingsButton = ref(null)
const collections = [
  { name: 'Morning pages', count: 7, hue: 'sage' },
  { name: 'To ponder', count: null, hue: 'sand' },
]

const accountInitial = computed(() => (
  props.authenticated ? props.accountLabel : 'Guest Reader'
).slice(0, 1).toUpperCase())

defineExpose({
  focusSettingsButton: () => settingsButton.value?.focus(),
})
</script>

<template>
  <aside class="sidebar" :class="{ collapsed: !open }" aria-label="Reading shelf navigation">
    <button class="brand" type="button" aria-label="Toggle sidebar" @click="emit('toggle')">
      <span class="leaf-mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="none">
          <path d="M12 35.5C12 20.1 20.4 10 36 8c1.1 15.5-6.8 26.8-20.5 27.8" stroke="currentColor" stroke-width="2.7" stroke-linecap="round"/>
          <path d="M12 38c6.3-7.5 12.8-12.5 21.5-17" stroke="currentColor" stroke-width="2.7" stroke-linecap="round"/>
        </svg>
      </span>
      <span class="brand-copy">
        <span class="brand-name">Leaf<span>Reader</span></span>
        <span class="brand-tagline">Quiet feeds for slow reading</span>
      </span>
    </button>

    <nav class="primary-nav" aria-label="Primary">
      <button
        v-for="item in ['All Stories', 'Saved', 'History']"
        :key="item"
        type="button"
        :class="{ active: view === item }"
        @click="emit('select-view', item)"
      >
        <span class="nav-icon" aria-hidden="true">{{ item === 'All Stories' ? '☷' : '♡' }}</span>
        <span>{{ item }}</span>
        <b v-if="item === 'All Stories'">{{ unread }}</b>
        <b v-if="item === 'History'">{{ historyGroups.reduce((total, group) => total + group.entries.length, 0) }}</b>
      </button>
    </nav>

    <div v-if="historyGroups.length" class="nav-section">
      <span>History</span>
    </div>
    <nav v-if="historyGroups.length" class="collections history-list" aria-label="History">
      <button
        v-for="group in historyGroups"
        :key="group.label"
        type="button"
        :class="{ active: view === 'History' }"
        @click="emit('select-view', 'History')"
      >
        <span class="nav-icon collection-dot sage" aria-hidden="true"></span>
        <span>{{ group.label }}</span>
        <b>{{ group.entries.length }}</b>
      </button>
    </nav>

    <div v-if="tagStats.length" class="nav-section">
      <span>Tags</span>
      <button v-if="selectedTag" class="tiny-button" type="button" aria-label="Clear tag filter" @click="emit('clear-tag')">x</button>
    </div>
    <label v-if="tagStats.length" class="tag-search">
      <input
        :value="tagQuery"
        type="text"
        placeholder="Search tags..."
        aria-label="Search tags"
        @input="emit('update:tag-query', $event.target.value)"
      />
    </label>
    <nav v-if="tagStats.length" class="collections tag-list" aria-label="Tags">
      <button
        v-for="tag in tagStats"
        :key="tag.name"
        type="button"
        :class="{ active: selectedTag === tag.name }"
        @click="emit('select-tag', tag.name)"
      >
        <span class="nav-icon collection-dot blue" aria-hidden="true"></span>
        <span>{{ tag.name }}</span>
        <b>{{ tag.count }}</b>
      </button>
    </nav>

    <div class="nav-section">
      <span>Collections</span>
      <button class="tiny-button" type="button" aria-label="Add publication" @click="emit('open-add-publication')">＋</button>
    </div>
    <nav class="collections" aria-label="Collections">
      <button
        v-for="collection in collections"
        :key="collection.name"
        type="button"
        :class="{ active: selectedCollection === collection.name }"
        @click="emit('select-collection', collection.name)"
      >
        <span class="nav-icon collection-dot" :class="collection.hue" aria-hidden="true"></span>
        <span>{{ collection.name }}</span>
        <b v-if="collection.count">{{ collection.count }}</b>
      </button>
    </nav>

    <div class="nav-section publication-title">
      <span>Publications</span>
      <button class="tiny-button" type="button" aria-label="Add publication" @click="emit('open-add-publication')">＋</button>
    </div>
    <nav class="publication-list" aria-label="Publications">
      <div
        v-for="publication in publications"
        :key="publication.name"
        class="publication-row-shell"
      >
        <button
          type="button"
          class="publication-row"
          :class="{ selected: selectedPublication === publication.name }"
          :title="publication.name"
          @click="emit('select-publication', publication)"
        >
          <span class="publication-mark" :style="{ background: publication.color }">{{ publication.mark }}</span>
          <span>{{ publication.name }}</span>
          <b v-if="publication.count">{{ publication.count }}</b>
        </button>
        <span v-if="publication.sourceType === 'cloud'" class="publication-actions">
          <button
            type="button"
            class="publication-action"
            aria-label="Refresh publication"
            title="Refresh"
            @click.stop="emit('refresh-publication', publication)"
          >↻</button>
          <button
            type="button"
            class="publication-action"
            aria-label="Remove publication"
            title="Remove"
            @click.stop="emit('remove-publication', publication)"
          >×</button>
        </span>
      </div>
    </nav>

    <button class="sidebar-add" type="button" @click="emit('open-add-publication')">
      <span aria-hidden="true">＋</span>
      Add publication
    </button>

    <div class="sidebar-bottom">
      <div v-if="authLoading" class="sidebar-account sidebar-account-loading" role="status">
        <span class="sidebar-account-avatar skeleton" aria-hidden="true"></span>
        <span class="sidebar-account-copy">Checking account...</span>
      </div>

      <div v-else class="sidebar-account">
        <span class="sidebar-account-avatar" aria-hidden="true">{{ accountInitial }}</span>
        <div class="sidebar-account-copy">
          <strong>{{ authenticated ? accountLabel : 'Guest Reader' }}</strong>
          <span :title="authenticated ? (user?.email || cloudStatus) : undefined">
            {{ authenticated ? (user?.email || cloudStatus) : 'Local reading space' }}
          </span>
        </div>
        <span class="sidebar-account-status">{{ authenticated ? cloudStatus : 'Read locally. Sync whenever you are ready.' }}</span>
      </div>

      <button
        v-if="!authLoading && !authenticated"
        class="sidebar-sign-in"
        type="button"
        aria-label="Sign in to sync your reading"
        @click="emit('sign-in')"
      >
        <span aria-hidden="true">↗</span>
        <span class="account-action-label">Sign in to sync</span>
      </button>

      <div class="sidebar-account-actions">
        <button type="button" aria-label="Open settings" @click="emit('open-settings')">
          <span aria-hidden="true">⚙</span>
          <span class="account-action-label">Settings</span>
        </button>
        <button
          v-if="!authLoading && authenticated"
          type="button"
          aria-label="Sign out"
          :disabled="accountBusy"
          @click="emit('sign-out')"
        >
          <span aria-hidden="true">↙</span>
          <span class="account-action-label">{{ accountBusy ? 'Signing out…' : 'Sign out' }}</span>
        </button>
      </div>
    </div>
  </aside>
</template>
