import crypto from "node:crypto"

export function verifyCronAuthorization(req) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return { ok: false, status: 503, error: { code: "SERVER_NOT_CONFIGURED", message: "Cron authentication is not configured." } }
  }

  const authorization = req.headers?.authorization || req.headers?.Authorization || ""
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : ""

  if (!token || !timingSafeEqual(token, expected)) {
    return { ok: false, status: 401, error: { code: "UNAUTHORIZED", message: "Cron authorization failed." } }
  }

  return { ok: true }
}

function timingSafeEqual(value, expected) {
  const valueBuffer = Buffer.from(value)
  const expectedBuffer = Buffer.from(expected)

  if (valueBuffer.length !== expectedBuffer.length) return false
  return crypto.timingSafeEqual(valueBuffer, expectedBuffer)
}
