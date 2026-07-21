<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  configured: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' },
  success: { type: String, default: '' },
})

const emit = defineEmits(['submit', 'forgot-password', 'continue-guest', 'mode-change'])

const mode = ref('sign-in')
const displayName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const validationError = ref('')
const showPassword = ref(false)

const isSignUp = computed(() => mode.value === 'sign-up')

function switchMode(nextMode) {
  mode.value = nextMode
  emit('mode-change', nextMode)
  validationError.value = ''
  password.value = ''
  confirmPassword.value = ''
}

function validate() {
  if (isSignUp.value && !displayName.value.trim()) return 'Enter a display name.'
  if (!email.value.trim()) return 'Enter your email address.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) return 'Enter a valid email address.'
  if (!password.value) return 'Enter your password.'
  if (password.value.length < 8) return 'Use a password with at least 8 characters.'
  if (isSignUp.value && password.value !== confirmPassword.value) return 'The passwords do not match.'
  return ''
}

function submit() {
  if (props.busy || !props.configured) return
  validationError.value = validate()
  if (validationError.value) return

  emit('submit', {
    mode: mode.value,
    displayName: displayName.value.trim(),
    email: email.value.trim(),
    password: password.value,
  })
}
</script>

<template>
  <form class="auth-form" novalidate @submit.prevent="submit">
    <div v-if="isSignUp" class="auth-field">
      <label for="auth-display-name">Display name</label>
      <div class="auth-input-wrap">
        <span aria-hidden="true">Aa</span>
        <input id="auth-display-name" v-model="displayName" type="text" autocomplete="name" placeholder="How should we greet you?" :disabled="busy" />
      </div>
    </div>

    <div class="auth-field">
      <label for="auth-email">Email</label>
      <div class="auth-input-wrap">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5.5h18v13H3zM4 7l8 6 8-6" /></svg>
        <input id="auth-email" v-model="email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" :disabled="busy" />
      </div>
    </div>

    <div class="auth-field">
      <label for="auth-password">Password</label>
      <div class="auth-input-wrap">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
        <input id="auth-password" v-model="password" :type="showPassword ? 'text' : 'password'" :autocomplete="isSignUp ? 'new-password' : 'current-password'" placeholder="Enter your password" :disabled="busy" />
        <button class="password-visibility" type="button" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword">
          {{ showPassword ? 'Hide' : 'Show' }}
        </button>
      </div>
    </div>

    <div v-if="isSignUp" class="auth-field">
      <label for="auth-confirm-password">Confirm password</label>
      <div class="auth-input-wrap">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
        <input id="auth-confirm-password" v-model="confirmPassword" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" placeholder="Enter it once more" :disabled="busy" />
      </div>
    </div>

    <button v-if="!isSignUp" class="auth-text-action forgot-link" type="button" @click="emit('forgot-password')">Forgot password?</button>

    <p v-if="validationError || error" class="auth-message error" role="alert">{{ validationError || error }}</p>
    <p v-if="success" class="auth-message success" role="status">{{ success }}</p>

    <button class="auth-primary" type="submit" :disabled="busy || !configured">
      <span v-if="busy" class="button-spinner" aria-hidden="true"></span>
      {{ busy ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in' }}
    </button>

    <template v-if="!isSignUp">
      <div class="auth-divider"><span>or</span></div>
      <button class="auth-guest" type="button" @click="emit('continue-guest')">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
        Continue as Guest
      </button>
      <p class="auth-switch">New to LeafReader? <button type="button" @click="switchMode('sign-up')">Create account</button></p>
    </template>
    <p v-else class="auth-switch">Already have an account? <button type="button" @click="switchMode('sign-in')">Back to sign in</button></p>
  </form>
</template>
