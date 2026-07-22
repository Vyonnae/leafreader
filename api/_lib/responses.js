import { createRequestId } from "./logger.js"

export class ApiRequestError extends Error {
  constructor(code, message, status = 400) {
    super(message)
    this.name = "ApiRequestError"
    this.code = code
    this.status = status
  }
}

export function setHeader(res, name, value) {
  if (typeof res.setHeader === "function") {
    res.setHeader(name, value)
    return
  }

  res.headers = { ...(res.headers || {}), [name]: value }
}

export function json(res, status, payload, requestId = createRequestId()) {
  setHeader(res, "Content-Type", "application/json")
  setHeader(res, "X-Request-ID", requestId)
  res.statusCode = status
  res.body = JSON.stringify(payload)
  if (typeof res.status === "function" && typeof res.json === "function") {
    return res.status(status).json(payload)
  }
  if (typeof res.end === "function") return res.end(res.body)
  return res
}

export function noContent(res, requestId = createRequestId()) {
  setHeader(res, "X-Request-ID", requestId)
  res.statusCode = 204
  if (typeof res.status === "function" && typeof res.end === "function") {
    return res.status(204).end()
  }
  if (typeof res.end === "function") return res.end()
  return res
}

export function errorJson(res, error, requestId = createRequestId()) {
  const code = error.code || "INTERNAL_ERROR"
  const status = code === "UNAUTHORIZED" ? 401 : error.status || 500
  const message = status >= 500 ? "LeafReader could not complete this request." : error.message
  return json(res, status, { code, message }, requestId)
}

export function assertMethod(req, allowed) {
  if (allowed.includes(req.method)) return { ok: true }
  return { ok: false, status: 405, error: { code: "METHOD_NOT_ALLOWED", message: "Method is not allowed." } }
}

export async function readJsonBody(req, { maxBytes = 64 * 1024 } = {}) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body

  const body = req.body == null ? await readStream(req) : String(req.body)
  if (Buffer.byteLength(body, "utf8") > maxBytes) {
    throw new ApiRequestError("BODY_TOO_LARGE", "Request body is too large.", 413)
  }

  try {
    return body ? JSON.parse(body) : {}
  } catch {
    throw new ApiRequestError("INVALID_JSON", "Request body must be valid JSON.", 400)
  }
}

async function readStream(req) {
  if (!req || typeof req[Symbol.asyncIterator] !== "function") return ""

  const chunks = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString("utf8")
}

export function withApi(handler, methods) {
  return async function apiHandler(req, res) {
    const requestId = createRequestId(req.headers?.["x-request-id"] || req.headers?.["X-Request-ID"])
    const method = assertMethod(req, methods)
    if (!method.ok) return json(res, method.status, method.error, requestId)

    try {
      return await handler(req, res, requestId)
    } catch (error) {
      return errorJson(res, error, requestId)
    }
  }
}
