import { isSupabaseConfigured, supabase } from "./supabaseClient"

const unavailableError = {
  code: "cloud_unavailable",
  message: "Cloud sync is unavailable. You can continue in Guest mode.",
}

function result(data = null, error = null) {
  return { data, error }
}

function authCallbackUrl(nextPath) {
  if (typeof window === "undefined") return undefined

  const callbackUrl = new URL("/auth/callback", window.location.origin)
  callbackUrl.searchParams.set("next", nextPath)
  return callbackUrl.toString()
}

function friendlyAuthError(
  error,
  fallback = "Something went wrong. Please try again.",
) {
  if (!error) return { code: "unknown", message: fallback }

  const source = `${error.code || ""} ${error.message || ""}`.toLowerCase()
  let message = fallback

  if (source.includes("invalid login credentials")) {
    message = "The email or password is incorrect."
  } else if (source.includes("email not confirmed")) {
    message = "Confirm your email before signing in."
  } else if (
    source.includes("user already registered") ||
    source.includes("already been registered")
  ) {
    message = "An account already exists for this email."
  } else if (
    source.includes("password") &&
    (source.includes("short") || source.includes("least"))
  ) {
    message = "Use a password with at least 8 characters."
  } else if (source.includes("rate limit") || source.includes("too many")) {
    message = "Too many attempts. Wait a moment and try again."
  } else if (source.includes("network") || source.includes("fetch")) {
    message =
      "LeafReader could not reach the cloud. Check your connection and retry."
  } else if (source.includes("expired") || source.includes("session")) {
    message = "Your session has expired. Please sign in again."
  }

  if (import.meta.env.DEV) {
    console.warn("LeafReader auth request failed.", {
      code: error.code,
      status: error.status,
    })
  }

  return { code: error.code || "auth_error", message }
}

async function runAuthRequest(request, fallback) {
  if (!isSupabaseConfigured || !supabase) return result(null, unavailableError)

  try {
    const { data, error } = await request()
    return error
      ? result(null, friendlyAuthError(error, fallback))
      : result(data)
  } catch (error) {
    return result(null, friendlyAuthError(error, fallback))
  }
}

export function getSession() {
  return runAuthRequest(
    () => supabase.auth.getSession(),
    "LeafReader could not restore your session.",
  )
}

export function getCurrentUser() {
  return runAuthRequest(
    () => supabase.auth.getUser(),
    "LeafReader could not load your account.",
  )
}

export function signUpWithEmail(email, password, displayName) {
  const emailRedirectTo = authCallbackUrl("/app")

  return runAuthRequest(
    () =>
      supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName.trim() },
          emailRedirectTo,
        },
      }),
    "LeafReader could not create your account.",
  )
}

export function signInWithEmail(email, password) {
  return runAuthRequest(
    () => supabase.auth.signInWithPassword({ email, password }),
    "LeafReader could not sign you in.",
  )
}

export function signOut() {
  return runAuthRequest(
    () => supabase.auth.signOut({ scope: "local" }),
    "LeafReader could not sign you out.",
  )
}

export function sendPasswordReset(email) {
  const redirectTo = authCallbackUrl("/reset-password")

  return runAuthRequest(
    () => supabase.auth.resetPasswordForEmail(email, { redirectTo }),
    "LeafReader could not send the reset email.",
  )
}

export function exchangeAuthCode(code) {
  return runAuthRequest(
    () => supabase.auth.exchangeCodeForSession(code),
    "LeafReader could not verify this email link.",
  )
}

export function updatePassword(password) {
  return runAuthRequest(
    () => supabase.auth.updateUser({ password }),
    "LeafReader could not update your password.",
  )
}

export function onAuthStateChange(callback) {
  if (!isSupabaseConfigured || !supabase) return () => {}

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })

  return () => data.subscription.unsubscribe()
}

export const authService = {
  getSession,
  getCurrentUser,
  signUpWithEmail,
  signInWithEmail,
  signOut,
  sendPasswordReset,
  exchangeAuthCode,
  updatePassword,
  onAuthStateChange,
}
