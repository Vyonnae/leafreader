<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthRecoveryLayout from '../components/auth/AuthRecoveryLayout.vue'
import ForgotPasswordForm from '../components/auth/ForgotPasswordForm.vue'
import { useAuth } from '../composables/useAuth'

defineOptions({ name: 'ForgotPasswordPage' })

const router = useRouter()
const { isSupabaseConfigured, sendPasswordReset } = useAuth()
const busy = ref(false)
const error = ref('')
const success = ref('')

async function handleSubmit({ email }) {
  error.value = ''
  success.value = ''
  busy.value = true

  try {
    const response = await sendPasswordReset(email)
    if (response.error) error.value = response.error.message
    else success.value = 'Reset link sent. Check your inbox to continue.'
  } catch {
    error.value = 'LeafReader could not send the reset email. Please try again.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthRecoveryLayout
    heading="Find your way back in."
    introduction="We will send a secure reset link to the email on your account."
  >
    <ForgotPasswordForm
      mode="request"
      :configured="isSupabaseConfigured"
      :busy="busy"
      :error="error"
      :success="success"
      @submit="handleSubmit"
      @back="router.push('/auth')"
    />
  </AuthRecoveryLayout>
</template>
