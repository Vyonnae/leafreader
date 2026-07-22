import { computed, readonly, ref } from "vue"
import {
  exchangeAuthCode as exchangeAuthCodeRequest,
  getSession,
  onAuthStateChange,
  sendPasswordReset,
  signInWithEmail,
  signOut as signOutRequest,
  signUpWithEmail,
  updatePassword,
} from "../services/authService"
import { isSupabaseConfigured } from "../services/supabaseClient"

const user = ref(null)
const session = ref(null)
const isAuthLoading = ref(true)
const isSigningOut = ref(false)
const authEvent = ref(null)

let initializePromise = null
let removeAuthListener = null

async function initializeAuth() {
  if (initializePromise) return initializePromise

  initializePromise = (async () => {
    if (!isSupabaseConfigured) {
      isAuthLoading.value = false
      return { data: null, error: null }
    }

    isAuthLoading.value = true
    const response = await getSession()

    if (!response.error) {
      session.value = response.data?.session || null
      user.value = session.value?.user || null
    }

    if (!removeAuthListener) {
      removeAuthListener = onAuthStateChange((event, nextSession) => {
        authEvent.value = event
        session.value = nextSession
        user.value = nextSession?.user || null
        isAuthLoading.value = false
      })
    }

    isAuthLoading.value = false
    return response
  })()

  return initializePromise
}

function disposeAuth() {
  removeAuthListener?.()
  removeAuthListener = null
  initializePromise = null
}

async function signUp(email, password, displayName) {
  const response = await signUpWithEmail(email, password, displayName)
  if (!response.error && response.data?.session) {
    session.value = response.data.session
    user.value = response.data.user
  }
  return response
}

async function signIn(email, password) {
  const response = await signInWithEmail(email, password)
  if (!response.error) {
    session.value = response.data?.session || null
    user.value = response.data?.user || session.value?.user || null
  }
  return response
}

async function exchangeAuthCode(code) {
  const response = await exchangeAuthCodeRequest(code)
  if (!response.error) {
    session.value = response.data?.session || null
    user.value = response.data?.user || session.value?.user || null
  }
  return response
}

async function signOut() {
  if (isSigningOut.value) {
    return {
      data: null,
      error: {
        code: "sign_out_in_progress",
        message: "Sign out is already in progress.",
      },
    }
  }

  isSigningOut.value = true
  try {
    const response = await signOutRequest()
    if (!response.error) {
      session.value = null
      user.value = null
    }
    return response
  } finally {
    isSigningOut.value = false
  }
}

export function useAuth() {
  return {
    user: readonly(user),
    session: readonly(session),
    authEvent: readonly(authEvent),
    isAuthenticated: computed(() => Boolean(user.value && session.value)),
    isAuthLoading: readonly(isAuthLoading),
    isSigningOut: readonly(isSigningOut),
    isSupabaseConfigured,
    initializeAuth,
    disposeAuth,
    signUp,
    signIn,
    exchangeAuthCode,
    signOut,
    sendPasswordReset,
    updatePassword,
  }
}
