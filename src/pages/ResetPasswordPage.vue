<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthRecoveryLayout from '../components/auth/AuthRecoveryLayout.vue'
import ForgotPasswordForm from '../components/auth/ForgotPasswordForm.vue'
import { useAuth } from '../composables/useAuth'

defineOptions({ name: 'ResetPasswordPage' })

const router = useRouter()
const { isAuthenticated, isSupabaseConfigured, updatePassword } = useAuth()
const busy = ref(false)
const error = ref('')
const success = ref('')

async function handleSubmit({ password }) {
  error.value = ''
  success.value = ''
  busy.value = true

  try {
    const response = await updatePassword(password)
    if (response.error) error.value = response.error.message
    else success.value = 'Your password has been updated. You can return to LeafReader.'
  } catch {
    error.value = 'LeafReader could not update your password. Please try again.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthRecoveryLayout
    heading="Choose a new password."
    introduction="Use at least 8 characters, then return to your reading space."
  >
    <ForgotPasswordForm
      v-if="isAuthenticated"
      mode="update"
      :configured="isSupabaseConfigured"
      :busy="busy"
      :error="error"
      :success="success"
      @submit="handleSubmit"
      @back="router.push('/auth')"
    />
    <div v-else class="auth-form">
      <p class="auth-message error" role="alert">This password reset link has expired or is no longer valid.</p>
      <button class="auth-primary" type="button" @click="router.push('/forgot-password')">Request a new reset link</button>
      <button class="auth-back" type="button" @click="router.push('/auth')">Return to sign in</button>
    </div>
  </AuthRecoveryLayout>
</template>
