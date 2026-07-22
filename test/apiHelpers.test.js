import { describe, expect, test, vi } from "vitest"
import { ApiRequestError, assertMethod, errorJson, json, readJsonBody, withApi } from "../api/_lib/responses.js"

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

  test("withApi logs the real classified error while returning its safe response", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {})
    const handler = withApi(async () => {
      throw new ApiRequestError("FEED_TIMEOUT", "Feed request timed out.", 504)
    }, ["POST"])
    const response = {}

    await handler({ method: "POST", url: "/api/feeds/discover", headers: {} }, response)

    expect(response.statusCode).toBe(504)
    expect(JSON.parse(response.body)).toMatchObject({
      code: "FEED_TIMEOUT",
      message: "LeafReader could not complete this request."
    })
    expect(log).toHaveBeenCalledOnce()
    expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({
      event: "api_error",
      method: "POST",
      path: "/api/feeds/discover",
      code: "FEED_TIMEOUT",
      status: 504
    })
    log.mockRestore()
  })
})
