<script setup>
import { useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'

defineProps({
  heading: { type: String, required: true },
  introduction: { type: String, required: true },
})

const router = useRouter()
const { isSupabaseConfigured } = useAuth()
</script>

<template>
  <main class="auth-page">
    <aside class="auth-visual" aria-label="LeafReader">
      <button class="auth-brand" type="button" @click="router.push('/app')">
        <span class="auth-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <path d="M12 35.5C12 20.1 20.4 10 36 8c1.1 15.5-6.8 26.8-20.5 27.8" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" />
            <path d="M12 38c6.3-7.5 12.8-12.5 21.5-17" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" />
          </svg>
        </span>
        <span>
          <strong>Leaf<em>Reader</em></strong>
          <small>Quiet feeds for slow reading</small>
        </span>
      </button>

      <div class="auth-illustration" aria-hidden="true">
        <svg viewBox="0 0 520 430" fill="none">
          <path d="M0 342c76-41 132-48 196-23 72 29 125 20 204-35 43-30 84-35 120-17v163H0V342Z" fill="#eef2eb" />
          <circle cx="389" cy="86" r="40" fill="#e8ece4" />
          <path d="M126 254c14-65 27-113 72-165" stroke="#658b75" stroke-width="3" stroke-linecap="round" />
          <path d="M173 119c-23-21-46-15-56 13 27 9 45 4 56-13ZM196 92c-6-31 8-50 38-56 1 29-11 48-38 56ZM155 166c-28-15-49-4-53 26 29 3 46-6 53-26ZM183 143c26-18 50-9 58 20-27 7-47 0-58-20ZM137 210c-29-8-48 7-45 36 28-3 43-14 45-36Z" fill="#b8cbbb" stroke="#658b75" stroke-width="2" />
          <path d="M87 250h82l-9 117H96L87 250Z" fill="#f7f8f3" stroke="#71887b" stroke-width="3" />
          <path d="M139 350c66-28 120-21 162 18V225c-51-25-102-21-153 12l-9 113Z" fill="#fffdf8" stroke="#587866" stroke-width="4" />
          <path d="M301 368c43-37 95-45 156-23l-17-118c-51-20-98-10-139 20v121Z" fill="#fffdf8" stroke="#587866" stroke-width="4" />
          <path d="M173 259c33-13 65-14 96-2M169 279c34-13 67-13 99-1M165 300c34-12 68-12 102 0M331 266c27-13 55-17 83-10M334 286c27-11 54-13 82-7M336 306c27-10 52-11 77-4" stroke="#c4cec5" stroke-width="3" stroke-linecap="round" />
          <path d="M256 362h38l-11 48-16-13-19 12 8-47Z" fill="#5f8d74" />
        </svg>
      </div>

      <p class="auth-visual-note">Your reading preferences stay in this browser until you choose to bring them to your account.</p>
    </aside>

    <section class="auth-content">
      <div class="auth-content-inner">
        <button class="auth-back-to-reader" type="button" @click="router.push('/app')">← Back to LeafReader</button>
        <h1>{{ heading }}</h1>
        <p class="auth-introduction">{{ introduction }}</p>
        <slot />
      </div>

      <div class="cloud-availability" :class="{ available: isSupabaseConfigured }" role="status">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .4-8A6 6 0 0 0 6 8.2 5 5 0 0 0 7 18Z" /></svg>
        {{ isSupabaseConfigured ? 'Secure cloud sync ready' : 'Cloud sync unavailable · Guest mode is ready' }}
      </div>
    </section>
  </main>
</template>
