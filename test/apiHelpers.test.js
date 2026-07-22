import { describe, expect, test } from "vitest"
import { assertMethod, errorJson, json, readJsonBody } from "../api/_lib/responses.js"

describe("API response helpers", () => {
  test("serializes stable JSON errors and request IDs", () => {
    const response = {}
    json(response, 401, { code: "UNAUTHORIZED", message: "Please sign in." }, "req_123")

    expect(response.statusCode).toBe(401)
    expect(response.headers["Content-Type"]).toBe("application/json")
    expect(response.headers["X-Request-ID"]).toBe("req_123")
    expect(JSON.parse(response.body)).toEqual({ code: "UNAUTHORIZED", message: "Please sign in." })
  })

  test("assertMethod rejects unsupported verbs", () => {
    expect(assertMethod({ method: "POST" }, ["GET"])).toMatchObject({
      ok: false,
      status: 405
    })
    expect(assertMethod({ method: "GET" }, ["GET"])).toEqual({ ok: true })
  })

  test("normalizes unauthorized errors to HTTP 401", () => {
    const response = {}
    errorJson(
      response,
      {
        code: "UNAUTHORIZED",
        message: "Please sign in to continue.",
        status: 503,
      },
      "req_unauthorized",
    )

    expect(response.statusCode).toBe(401)
    expect(JSON.parse(response.body)).toEqual({
      code: "UNAUTHORIZED",
      message: "Please sign in to continue.",
    })
  })

  test("readJsonBody enforces valid JSON and byte limits", async () => {
    await expect(readJsonBody({ body: '{"ok":true}' })).resolves.toEqual({ ok: true })
    await expect(readJsonBody({ body: "{bad" })).rejects.toMatchObject({ code: "INVALID_JSON" })
    await expect(readJsonBody({ body: '{"too":"large"}' }, { maxBytes: 4 })).rejects.toMatchObject({ code: "BODY_TOO_LARGE" })
  })
})
