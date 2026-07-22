import { supabase } from './supabaseClient'

const DEFAULT_TIMEOUT_MS = 10_000

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/+$/,
  "",
)

export class ApiError extends Error {
  constructor(message, details = {}) {
    super(message, details.cause ? { cause: details.cause } : undefined)
    this.name = "ApiError"
    this.status = details.status ?? null
    this.statusText = details.statusText ?? ""
    this.data = details.data ?? null
    this.url = details.url ?? ""
  }
}

export class ApiTimeoutError extends Error {
  constructor(message, details = {}) {
    super(message)
    this.name = "ApiTimeoutError"
    this.timeout = details.timeout ?? DEFAULT_TIMEOUT_MS
    this.url = details.url ?? ""
  }
}

export class ApiNetworkError extends Error {
  constructor(message, details = {}) {
    super(message, details.cause ? { cause: details.cause } : undefined)
    this.name = "ApiNetworkError"
    this.url = details.url ?? ""
  }
}

function buildUrl(path, baseUrl) {
  if (/^https?:\/\//i.test(path)) return path
  if (!baseUrl) return path
  const normalizedBaseUrl = String(baseUrl).replace(/\/+$/, "")
  return `${normalizedBaseUrl}/${String(path).replace(/^\/+/, "")}`
}

function prepareBody(body, headers) {
  if (body == null) return undefined
  if (
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof URLSearchParams
  ) {
    return body
  }

  if (!headers.has("Content-Type"))
    headers.set("Content-Type", "application/json")
  return JSON.stringify(body)
}

async function parseResponse(response) {
  if (response.status === 204) return null

  const text = await response.text()
  if (!text) return null

  const contentType = response.headers.get("content-type") || ""
  const looksLikeJson =
    contentType.includes("application/json") || /^[\[{]/.test(text.trim())
  if (!looksLikeJson) return text

  try {
    return JSON.parse(text)
  } catch (error) {
    throw new ApiError("The server returned invalid JSON.", {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      data: text,
      cause: error,
    })
  }
}

export function createApiClient({
  baseUrl = API_BASE_URL,
  timeout = DEFAULT_TIMEOUT_MS,
  getAccessToken = getCurrentAccessToken,
} = {}) {
  async function request(path, options = {}) {
    const url = buildUrl(path, baseUrl)
    const controller = new AbortController()
    const requestTimeout = options.timeout ?? timeout
    let didTimeout = false

    const abortFromCaller = () => controller.abort(options.signal?.reason)
    if (options.signal?.aborted) abortFromCaller()
    else
      options.signal?.addEventListener("abort", abortFromCaller, { once: true })

    const timeoutId = globalThis.setTimeout(() => {
      didTimeout = true
      controller.abort()
    }, requestTimeout)

    try {
      const headers = new Headers({
        Accept: "application/json",
        ...options.headers,
      })
      const accessToken = await getAccessToken?.()
      if (!accessToken) {
        throw new ApiError("Please sign in to continue.", {
          status: 401,
          data: {
            code: "UNAUTHORIZED",
            message: "Please sign in to continue.",
          },
          url,
        })
      }
      headers.set("Authorization", `Bearer ${accessToken}`)

      const response = await fetch(url, {
        ...options,
        method: options.method || "GET",
        headers,
        body: prepareBody(options.body, headers),
        signal: controller.signal,
      })
      const data = await parseResponse(response)

      if (!response.ok) {
        const message =
          data?.message ||
          data?.error ||
          `Request failed with status ${response.status}.`
        throw new ApiError(message, {
          status: response.status,
          statusText: response.statusText,
          data,
          url,
        })
      }

      return data
    } catch (error) {
      if (error instanceof ApiError) throw error
      if (didTimeout) {
        throw new ApiTimeoutError(
          `Request timed out after ${requestTimeout}ms.`,
          {
            timeout: requestTimeout,
            url,
          },
        )
      }
      throw new ApiNetworkError("The request could not reach the server.", {
        cause: error,
        url,
      })
    } finally {
      globalThis.clearTimeout(timeoutId)
      options.signal?.removeEventListener("abort", abortFromCaller)
    }
  }

  return {
    request,
    get: (path, options) => request(path, { ...options, method: "GET" }),
    post: (path, body, options) =>
      request(path, { ...options, method: "POST", body }),
    patch: (path, body, options) =>
      request(path, { ...options, method: "PATCH", body }),
    delete: (path, options) => request(path, { ...options, method: "DELETE" }),
  }
}

export const apiClient = createApiClient()

async function getCurrentAccessToken() {
  if (!supabase) return ''
  const { data } = await supabase.auth.getSession()
  return data?.session?.access_token || ''
}
