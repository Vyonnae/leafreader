import { describe, expect, test } from "vitest"
import { createRequestId, redactSecrets } from "../api/_lib/logger.js"

describe("redactSecrets", () => {
  test("recursively redacts credentials and token-looking keys", () => {
    const redacted = redactSecrets({
      authorization: "Bearer token",
      password: "secret",
      nested: {
        refresh_token: "refresh",
        accessToken: "access",
        SUPABASE_SECRET_KEY: "service"
      },
      safe: "value"
    })

    expect(redacted).toEqual({
      authorization: "[redacted]",
      password: "[redacted]",
      nested: {
        refresh_token: "[redacted]",
        accessToken: "[redacted]",
        SUPABASE_SECRET_KEY: "[redacted]"
      },
      safe: "value"
    })
  })
})

describe("createRequestId", () => {
  test("keeps bounded caller IDs and replaces invalid values", () => {
    expect(createRequestId("abc-123")).toBe("abc-123")
    expect(createRequestId("x".repeat(200))).toMatch(/^req_/)
    expect(createRequestId("bad header")).toMatch(/^req_/)
  })
})
