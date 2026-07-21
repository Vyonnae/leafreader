<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  mode: { type: String, default: 'request' },
  configured: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' },
  success: { type: String, default: '' },
})

const emit = defineEmits(['submit', 'back'])
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const validationError = ref('')
const isUpdate = computed(() => props.mode === 'update')

function submit() {
  if (props.busy || !props.configured) return
  validationError.value = ''

  if (isUpdate.value) {
    if (password.value.length < 8) validationError.value = 'Use a password with at least 8 characters.'
    else if (password.value !== confirmPassword.value) validationError.value = 'The passwords do not match.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    validationError.value = 'Enter a valid email address.'
  }

  if (validationError.value) return
  emit('submit', isUpdate.value ? { password: password.value } : { email: email.value.trim() })
}
</script>

<template>
  <form class="auth-form" novalidate @submit.prevent="submit">
    <template v-if="isUpdate">
      <div class="auth-field">
        <label for="reset-password">New password</label>
        <div class="auth-input-wrap">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
          <input id="reset-password" v-model="password" type="password" autocomplete="new-password" placeholder="At least 8 characters" :disabled="busy" />
        </div>
      </div>
      <div class="auth-field">
        <label for="reset-password-confirmation">Confirm new password</label>
        <div class="auth-input-wrap">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
          <input id="reset-password-confirmation" v-model="confirmPassword" type="password" autocomplete="new-password" placeholder="Enter it once more" :disabled="busy" />
        </div>
      </div>
    </template>
    <div v-else class="auth-field">
      <label for="reset-email">Email</label>
      <div class="auth-input-wrap">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5.5h18v13H3zM4 7l8 6 8-6" /></svg>
        <input id="reset-email" v-model="email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" :disabled="busy" />
      </div>
    </div>

    <p v-if="validationError || error" class="auth-message error" role="alert">{{ validationError || error }}</p>
    <p v-if="success" class="auth-message success" role="status">{{ success }}</p>

    <button class="auth-primary" type="submit" :disabled="busy || !configured">
      <span v-if="busy" class="button-spinner" aria-hidden="true"></span>
      {{ busy ? 'Please wait…' : isUpdate ? 'Update password' : 'Send reset link' }}
    </button>
    <button class="auth-back" type="button" @click="emit('back')">{{ isUpdate ? 'Return to sign in' : 'Back to sign in' }}</button>
  </form>
</template>

