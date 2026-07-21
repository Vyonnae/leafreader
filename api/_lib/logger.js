import crypto from "node:crypto"

const SECRET_KEY_PATTERN = /(authorization|password|secret|token|refresh_token|access_token|apikey|api_key|service_role)/i
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/

export function redactSecrets(value) {
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item))
  }

  if (!value || typeof value !== "object") {
    return value
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SECRET_KEY_PATTERN.test(key) ? "[redacted]" : redactSecrets(entry)
    ])
  )
}

export function createRequestId(value) {
  if (typeof value === "string" && REQUEST_ID_PATTERN.test(value)) {
    return value
  }

  return `req_${crypto.randomBytes(12).toString("hex")}`
}

export function logRequest(event, details = {}) {
  console.log(JSON.stringify(redactSecrets({ event, ...details })))
}
