<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthRecoveryLayout from '../components/auth/AuthRecoveryLayout.vue'
import { useAuth } from '../composables/useAuth'

defineOptions({ name: 'AuthCallbackPage' })

const route = useRoute()
const router = useRouter()
const { exchangeAuthCode } = useAuth()
const busy = ref(true)
const error = ref('')

function safeDestination(value) {
  return value === '/reset-password' ? value : '/app'
}

onMounted(async () => {
  const code = typeof route.query.code === 'string' ? route.query.code : ''
  if (!code) {
    error.value = 'This email link is incomplete or is no longer valid.'
    busy.value = false
    return
  }

  try {
    const response = await exchangeAuthCode(code)
    if (response.error) {
      error.value = response.error.message
      busy.value = false
      return
    }
    await router.replace(safeDestination(route.query.next))
  } catch {
    error.value = 'LeafReader could not verify this email link. Please try again.'
    busy.value = false
  }
})
</script>

<template>
  <AuthRecoveryLayout
    heading="Verifying your email link."
    introduction="LeafReader is securely restoring your account session."
  >
    <div class="auth-form auth-callback-status" role="status" aria-live="polite">
      <template v-if="busy">
        <span class="button-spinner auth-callback-spinner" aria-hidden="true"></span>
        <p>Verifying your link…</p>
      </template>
      <template v-else-if="error">
        <p class="auth-message error" role="alert">{{ error }}</p>
        <button class="auth-primary" type="button" @click="router.push('/auth')">Return to sign in</button>
      </template>
    </div>
  </AuthRecoveryLayout>
</template>
