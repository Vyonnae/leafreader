<script setup>
import { computed, ref, watch } from 'vue'
import ConfirmDialog from '../ui/ConfirmDialog.vue'
import { parseOpmlFile } from '../../utils/opml'

const props = defineProps({
  settings: {
    type: Object,
    required: true,
  },
  storageKey: {
    type: String,
    required: true,
  },
  addedPublicationsCount: {
    type: Number,
    default: 0,
  },
  user: {
    type: Object,
    default: null,
  },
  profile: {
    type: Object,
    default: null,
  },
  cloudStatus: {
    type: String,
    default: 'Local reading space',
  },
  cloudState: {
    type: String,
    default: 'local',
  },
  cloudConfigured: {
    type: Boolean,
    default: false,
  },
  accountBusy: {
    type: Boolean,
    default: false,
  },
  accountMessage: {
    type: String,
    default: '',
  },
  accountError: {
    type: String,
    default: '',
  },
})

const emit = defineEmits([
  'close',
  'update-setting',
  'clear-reading-history',
  'clear-saved-stories',
  'remove-added-publications',
  'restore-default-settings',
  'clear-all-local-data',
  'sign-in',
  'sign-out',
  'update-profile',
  'change-password',
  'retry-sync',
  'import-opml',
  'export-opml',
  'delete-account',
])

const closeButton = ref(null)
const pendingAction = ref(null)
const displayName = ref(props.profile?.display_name || '')
const newPassword = ref('')
const opmlInput = ref(null)
const opmlFeeds = ref([])
const opmlErrors = ref([])
const deleteConfirmation = ref('')

const groups = ['Account', 'Reading', 'Appearance', 'Behavior', 'Data']

watch(() => props.profile?.display_name, (value) => {
  displayName.value = value || ''
})

function submitDisplayName() {
  if (!displayName.value.trim() || props.accountBusy) return
  emit('update-profile', displayName.value.trim())
}

function submitPassword() {
  if (newPassword.value.length < 8 || props.accountBusy) return
  emit('change-password', newPassword.value)
  newPassword.value = ''
}

async function handleOpmlFile(event) {
  const file = event.target.files?.[0]
  opmlFeeds.value = []
  opmlErrors.value = []
  if (!file) return

  const extensionAllowed = /\.(opml|xml)$/i.test(file.name)
  if (!extensionAllowed || file.size > 1024 * 1024) {
    opmlErrors.value = [{ code: 'INVALID_FILE', message: 'Choose a .opml or .xml file under 1 MiB.' }]
    return
  }

  const result = parseOpmlFile(await file.text())
  opmlFeeds.value = result.feeds
  opmlErrors.value = result.errors
}

function confirmOpmlImport() {
  if (!opmlFeeds.value.length || props.accountBusy) return
  emit('import-opml', opmlFeeds.value)
}

function submitAccountDelete() {
  if (deleteConfirmation.value !== 'DELETE' || props.accountBusy) return
  emit('delete-account', deleteConfirmation.value)
}

const confirmCopy = {
  clearReadingHistory: {
    title: 'Clear reading history?',
    description: 'All stories will be marked as unread. Your saved stories and publications will remain.',
    action: 'Clear history',
    event: 'clear-reading-history',
  },
  clearSavedStories: {
    title: 'Clear saved stories?',
    description: 'All saved story markers will be removed. Your reading history and publications will remain.',
    action: 'Clear saved',
    event: 'clear-saved-stories',
  },
  removeAddedPublications: {
    title: 'Remove added publications?',
    description: 'Only publications added in this browser will be removed. Built-in publications will remain.',
    action: 'Remove publications',
    event: 'remove-added-publications',
  },
  restoreDefaultSettings: {
    title: 'Restore default settings?',
    description: 'Reading preferences will return to their default values. Saved and read stories will remain.',
    action: 'Restore defaults',
    event: 'restore-default-settings',
  },
  clearAllLocalData: {
    title: 'Clear all local data?',
    description: 'This will remove your reading history, saved stories, added publications, and personal settings from this browser. This action cannot be undone.',
    action: 'Clear all data',
    event: 'clear-all-local-data',
  },
}

const activeConfirm = computed(() => pendingAction.value ? confirmCopy[pendingAction.value] : null)

function updateSetting(key, value) {
  emit('update-setting', { key, value })
}

function openConfirm(action) {
  pendingAction.value = action
}

function cancelConfirm() {
  pendingAction.value = null
}

function confirmAction() {
  if (!activeConfirm.value) return
  emit(activeConfirm.value.event)
  pendingAction.value = null
}

function handleEscape() {
  if (pendingAction.value) {
    cancelConfirm()
    return
  }
  emit('close')
}

defineExpose({
  focusCloseButton: () => closeButton.value?.focus(),
})
</script>

<template>
  <div class="settings-backdrop" @click.self="emit('close')">
    <section
      class="settings-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      @keydown.esc.stop.prevent="handleEscape"
    >
      <header class="settings-header">
        <div>
          <p class="settings-kicker">Local reading space</p>
          <h2 id="settings-title" tabindex="-1">Settings</h2>
          <p>Personalize your reading space.</p>
        </div>
        <button ref="closeButton" class="settings-close" type="button" aria-label="Close settings" @click="emit('close')">×</button>
      </header>

      <div class="settings-body">
        <nav class="settings-nav" aria-label="Settings groups">
          <a v-for="group in groups" :key="group" :href="'#settings-' + group.toLowerCase()">{{ group }}</a>
        </nav>

        <div class="settings-content">
          <section id="settings-account" class="settings-section account-section" aria-labelledby="settings-account-title">
            <div class="section-heading">
              <span aria-hidden="true">◎</span>
              <div>
                <h3 id="settings-account-title">Account</h3>
                <p>{{ user ? 'Your LeafReader identity and cloud connection.' : 'Keep reading locally or sign in for cross-device sync.' }}</p>
              </div>
            </div>

            <div v-if="!user" class="guest-account-card">
              <span class="account-avatar" aria-hidden="true">G</span>
              <div>
                <h4>Guest Reader</h4>
                <p>Your reading activity is currently stored only in this browser.</p>
              </div>
              <button type="button" class="account-primary-action" @click="emit('sign-in')">Sign in or create account</button>
              <p class="account-explainer">Sign in to sync your subscriptions, saved stories, reading history, and preferences across devices.</p>
            </div>

            <div v-else class="signed-in-account">
              <div class="account-identity">
                <span class="account-avatar" aria-hidden="true">{{ (profile?.display_name || user.email || 'L').slice(0, 1).toUpperCase() }}</span>
                <div>
                  <strong>{{ profile?.display_name || user.user_metadata?.display_name || 'LeafReader' }}</strong>
                  <span>{{ user.email }}</span>
                </div>
              </div>

              <div class="cloud-status-row" :data-state="cloudState">
                <span class="cloud-status-dot" aria-hidden="true"></span>
                <div>
                  <strong>{{ cloudStatus }}</strong>
                  <p v-if="cloudState === 'offline'">Changes remain cached in this browser until the connection returns.</p>
                  <p v-else-if="cloudState === 'error'">Local data is safe. Retry when you are ready.</p>
                  <p v-else>Your settings use Supabase Auth and Row Level Security.</p>
                </div>
                <button v-if="['offline', 'error'].includes(cloudState)" type="button" :disabled="accountBusy" @click="emit('retry-sync')">Retry</button>
              </div>

              <form class="account-form" @submit.prevent="submitDisplayName">
                <label for="account-display-name">Display name</label>
                <div>
                  <input id="account-display-name" v-model="displayName" type="text" autocomplete="name" :disabled="accountBusy" />
                  <button type="submit" :disabled="accountBusy || !displayName.trim()">Save</button>
                </div>
              </form>

              <form class="account-form" @submit.prevent="submitPassword">
                <label for="account-new-password">Change password</label>
                <div>
                  <input id="account-new-password" v-model="newPassword" type="password" autocomplete="new-password" minlength="8" placeholder="At least 8 characters" :disabled="accountBusy" />
                  <button type="submit" :disabled="accountBusy || newPassword.length < 8">Update</button>
                </div>
              </form>

              <p v-if="accountError" class="account-feedback error" role="alert">{{ accountError }}</p>
              <p v-if="accountMessage" class="account-feedback success" role="status">{{ accountMessage }}</p>

              <div class="account-actions">
                <button type="button" :disabled="accountBusy" @click="emit('sign-out')">{{ accountBusy ? 'Signing out…' : 'Sign out' }}</button>
              </div>

              <div class="opml-card">
                <div>
                  <h4>OPML subscriptions</h4>
                  <p>Import or export your RSS subscriptions without changing Guest local data.</p>
                </div>
                <input ref="opmlInput" class="visually-hidden" type="file" accept=".opml,.xml" @change="handleOpmlFile" />
                <div class="opml-actions">
                  <button type="button" :disabled="accountBusy" @click="opmlInput?.click()">Choose OPML</button>
                  <button type="button" :disabled="accountBusy" @click="emit('export-opml')">Export OPML</button>
                </div>
                <p v-if="opmlErrors.length" class="account-feedback error" role="alert">{{ opmlErrors[0].message }}</p>
                <div v-if="opmlFeeds.length" class="opml-preview">
                  <strong>{{ opmlFeeds.length }} feeds ready to import</strong>
                  <ul>
                    <li v-for="feed in opmlFeeds.slice(0, 5)" :key="feed.feedUrl">{{ feed.title }}</li>
                  </ul>
                  <button type="button" :disabled="accountBusy" @click="confirmOpmlImport">Import selected feeds</button>
                </div>
              </div>

              <form class="account-delete-card" @submit.prevent="submitAccountDelete">
                <h4>Delete account</h4>
                <p>This removes your Supabase account and account-owned rows. Shared feed records are retained.</p>
                <label for="delete-account-confirmation">Type DELETE to confirm</label>
                <div>
                  <input id="delete-account-confirmation" v-model="deleteConfirmation" autocomplete="off" :disabled="accountBusy" />
                  <button type="submit" class="danger-button" :disabled="accountBusy || deleteConfirmation !== 'DELETE'">Delete account</button>
                </div>
              </form>
            </div>

            <p v-if="!cloudConfigured" class="account-cloud-unavailable">Cloud sync unavailable. Guest reading and localStorage continue to work normally.</p>
          </section>

          <section id="settings-reading" class="settings-section" aria-labelledby="settings-reading-title">
            <div class="section-heading">
              <span aria-hidden="true">Aa</span>
              <div>
                <h3 id="settings-reading-title">Reading</h3>
                <p>Shape the reader pane for longer sessions.</p>
              </div>
            </div>

            <div class="setting-row">
              <div>
                <h4>Article font size</h4>
                <p>Applies to the reader body text.</p>
              </div>
              <div class="segmented-control" role="group" aria-label="Article font size">
                <button
                  v-for="option in ['small', 'medium', 'large']"
                  :key="option"
                  type="button"
                  :class="{ active: settings.fontSize === option }"
                  :aria-pressed="settings.fontSize === option"
                  @click="updateSetting('fontSize', option)"
                >
                  {{ option[0].toUpperCase() + option.slice(1) }}
                </button>
              </div>
            </div>

            <div class="setting-row">
              <div>
                <h4>Reading width</h4>
                <p>Changes the maximum line length on desktop and tablet.</p>
              </div>
              <div class="segmented-control" role="group" aria-label="Reading width">
                <button
                  v-for="option in ['narrow', 'comfortable', 'wide']"
                  :key="option"
                  type="button"
                  :class="{ active: settings.readingWidth === option }"
                  :aria-pressed="settings.readingWidth === option"
                  @click="updateSetting('readingWidth', option)"
                >
                  {{ option[0].toUpperCase() + option.slice(1) }}
                </button>
              </div>
            </div>

            <div class="setting-row">
              <div>
                <h4>Reading background</h4>
                <p>Choose a fresh surface or warmer paper tone.</p>
              </div>
              <div class="segmented-control" role="group" aria-label="Reading background">
                <button
                  v-for="option in ['fresh', 'paper']"
                  :key="option"
                  type="button"
                  :class="{ active: settings.readingBackground === option }"
                  :aria-pressed="settings.readingBackground === option"
                  @click="updateSetting('readingBackground', option)"
                >
                  {{ option[0].toUpperCase() + option.slice(1) }}
                </button>
              </div>
            </div>

            <label class="setting-row setting-toggle">
              <div>
                <h4>Open stories in Focus Mode by default</h4>
                <p>Stories still allow manual exit from Focus Mode.</p>
              </div>
              <input
                type="checkbox"
                :checked="settings.defaultFocusMode"
                @change="updateSetting('defaultFocusMode', $event.target.checked)"
              />
              <span aria-hidden="true"></span>
            </label>
          </section>

          <section id="settings-appearance" class="settings-section" aria-labelledby="settings-appearance-title">
            <div class="section-heading">
              <span aria-hidden="true">☼</span>
              <div>
                <h3 id="settings-appearance-title">Appearance</h3>
                <p>Adjust the library layout and interface motion.</p>
              </div>
            </div>

            <div class="setting-row">
              <div>
                <h4>Default layout</h4>
                <p>Switches the current story list immediately.</p>
              </div>
              <div class="segmented-control" role="group" aria-label="Default layout">
                <button
                  v-for="option in ['list', 'cards']"
                  :key="option"
                  type="button"
                  :class="{ active: settings.defaultLayout === option }"
                  :aria-pressed="settings.defaultLayout === option"
                  @click="updateSetting('defaultLayout', option)"
                >
                  {{ option[0].toUpperCase() + option.slice(1) }}
                </button>
              </div>
            </div>

            <div class="setting-row">
              <div>
                <h4>Sidebar default state</h4>
                <p>Desktop remembers this state; mobile still uses a drawer.</p>
              </div>
              <div class="segmented-control" role="group" aria-label="Sidebar default state">
                <button
                  type="button"
                  :class="{ active: !settings.sidebarCollapsed }"
                  :aria-pressed="!settings.sidebarCollapsed"
                  @click="updateSetting('sidebarCollapsed', false)"
                >
                  Expanded
                </button>
                <button
                  type="button"
                  :class="{ active: settings.sidebarCollapsed }"
                  :aria-pressed="settings.sidebarCollapsed"
                  @click="updateSetting('sidebarCollapsed', true)"
                >
                  Collapsed
                </button>
              </div>
            </div>

            <label class="setting-row setting-toggle">
              <div>
                <h4>Show article summaries in the story list</h4>
                <p>Titles, publications, time, and tags remain visible.</p>
              </div>
              <input
                type="checkbox"
                :checked="settings.showExcerpts"
                @change="updateSetting('showExcerpts', $event.target.checked)"
              />
              <span aria-hidden="true"></span>
            </label>

            <div class="setting-row">
              <div>
                <h4>Motion</h4>
                <p>Reduced lowers non-essential transitions and hover movement.</p>
              </div>
              <div class="segmented-control" role="group" aria-label="Motion">
                <button
                  v-for="option in ['full', 'reduced']"
                  :key="option"
                  type="button"
                  :class="{ active: settings.motion === option }"
                  :aria-pressed="settings.motion === option"
                  @click="updateSetting('motion', option)"
                >
                  {{ option[0].toUpperCase() + option.slice(1) }}
                </button>
              </div>
            </div>
          </section>

          <section id="settings-behavior" class="settings-section" aria-labelledby="settings-behavior-title">
            <div class="section-heading">
              <span aria-hidden="true">↗</span>
              <div>
                <h3 id="settings-behavior-title">Behavior</h3>
                <p>Control what happens when stories are opened or changed.</p>
              </div>
            </div>

            <label class="setting-row setting-toggle">
              <div>
                <h4>Mark a story as read when opened</h4>
                <p>Manual read and unread controls remain available.</p>
              </div>
              <input
                type="checkbox"
                :checked="settings.autoMarkAsRead"
                @change="updateSetting('autoMarkAsRead', $event.target.checked)"
              />
              <span aria-hidden="true"></span>
            </label>

            <label class="setting-row setting-toggle">
              <div>
                <h4>Open original stories in a new tab</h4>
                <p>Controls the target behavior of original story links.</p>
              </div>
              <input
                type="checkbox"
                :checked="settings.openOriginalInNewTab"
                @change="updateSetting('openOriginalInNewTab', $event.target.checked)"
              />
              <span aria-hidden="true"></span>
            </label>

            <label class="setting-row setting-toggle">
              <div>
                <h4>Show notifications for reading actions</h4>
                <p>Errors still appear even when action notifications are off.</p>
              </div>
              <input
                type="checkbox"
                :checked="settings.showNotifications"
                @change="updateSetting('showNotifications', $event.target.checked)"
              />
              <span aria-hidden="true"></span>
            </label>
          </section>

          <section id="settings-data" class="settings-section danger-section" aria-labelledby="settings-data-title">
            <div class="section-heading">
              <span aria-hidden="true">!</span>
              <div>
                <h3 id="settings-data-title">Data</h3>
                <p>Manage the reading data stored in this browser.</p>
              </div>
            </div>

            <div class="data-actions">
              <button type="button" @click="openConfirm('clearReadingHistory')">Clear reading history</button>
              <button type="button" @click="openConfirm('clearSavedStories')">Clear saved stories</button>
              <button type="button" @click="openConfirm('removeAddedPublications')" :disabled="addedPublicationsCount === 0">
                Remove added publications
                <span>{{ addedPublicationsCount }}</span>
              </button>
              <button type="button" @click="openConfirm('restoreDefaultSettings')">Restore default settings</button>
              <button type="button" class="danger-button" @click="openConfirm('clearAllLocalData')">Clear all local data</button>
            </div>

            <p class="storage-note">Storage key: <code>{{ storageKey }}</code></p>
          </section>
        </div>
      </div>

      <footer class="settings-footer">
        <span>{{ user && cloudState === 'synced' ? 'Changes save to your account and this browser.' : 'Changes save automatically in this browser.' }}</span>
        <button type="button" @click="openConfirm('restoreDefaultSettings')">Restore default settings</button>
      </footer>

      <ConfirmDialog
        v-if="activeConfirm"
        :title="activeConfirm.title"
        :description="activeConfirm.description"
        :action-label="activeConfirm.action"
        @cancel="cancelConfirm"
        @confirm="confirmAction"
      />
    </section>
  </div>
</template>
