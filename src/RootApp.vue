<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAuth } from './composables/useAuth'

const { initializeAuth, disposeAuth, isAuthLoading, user } = useAuth()

onMounted(initializeAuth)
onBeforeUnmount(disposeAuth)
</script>

<template>
  <div v-if="isAuthLoading" class="session-loader" role="status" aria-live="polite">
    <span class="session-loader-mark" aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none">
        <path d="M12 35.5C12 20.1 20.4 10 36 8c1.1 15.5-6.8 26.8-20.5 27.8" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" />
        <path d="M12 38c6.3-7.5 12.8-12.5 21.5-17" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" />
      </svg>
    </span>
    <p>Opening your reading space…</p>
  </div>
  <RouterView v-else :key="user?.id || 'guest'" />
</template>
