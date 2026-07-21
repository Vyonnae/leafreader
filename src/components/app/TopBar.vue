<script setup>
defineProps({
  pageTitle: {
    type: String,
    required: true,
  },
  pageSummary: {
    type: String,
    required: true,
  },
  userLabel: {
    type: String,
    default: 'Guest Reader',
  },
  authenticated: {
    type: Boolean,
    default: false,
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

const emit = defineEmits(['open-navigation', 'open-add-publication', 'open-settings', 'sign-out'])
</script>

<template>
  <header class="topbar">
    <button class="mobile-menu" type="button" aria-label="Open navigation" @click="emit('open-navigation')">☰</button>
    <div class="crumb">
      <span>YOUR LIBRARY</span>
      <i aria-hidden="true">/</i>
      <strong>{{ pageTitle }}</strong>
      <em>{{ pageSummary }}</em>
    </div>
    <div class="top-actions">
      <button type="button" class="add-feed" @click="emit('open-add-publication')">＋ Add publication</button>
      <button class="top-account" type="button" :aria-label="`Open settings for ${userLabel}. ${cloudStatus}`" @click="emit('open-settings')">
        <span class="top-account-copy">
          <strong>{{ userLabel }}</strong>
          <small>{{ cloudStatus }}</small>
        </span>
        <span class="avatar" aria-hidden="true">{{ userLabel.slice(0, 1).toUpperCase() }}</span>
      </button>
      <button v-if="authenticated" class="top-sign-out" type="button" :disabled="accountBusy" @click="emit('sign-out')">
        {{ accountBusy ? 'Signing out…' : 'Sign out' }}
      </button>
    </div>
  </header>
</template>
