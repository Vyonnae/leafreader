import { afterEach, describe, expect, test, vi } from "vitest"
import { ApiError, createApiClient } from "../src/services/apiClient.js"

function jsonResponse(payload = {}, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

describe("authenticated API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test("does not send a protected request without an access token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal("fetch", fetchMock)
    const client = createApiClient({ getAccessToken: async () => "" })

    await expect(client.get("/api/library?limit=100")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      message: "Please sign in to continue.",
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test("does not let a caller-provided header bypass the current session", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal("fetch", fetchMock)
    const client = createApiClient({ getAccessToken: async () => "" })

    await expect(
      client.get("/api/library?limit=100", {
        headers: { Authorization: "Bearer caller-provided-token" },
      }),
    ).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      message: "Please sign in to continue.",
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test("uses the current session token for protected requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ articles: [] }))
    vi.stubGlobal("fetch", fetchMock)
    const client = createApiClient({
      getAccessToken: async () => "signed-in-token",
    })

    await client.get("/api/library?limit=100", {
      headers: { Authorization: "Bearer stale-token" },
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [, options] = fetchMock.mock.calls[0]
    expect(options.headers.get("Authorization")).toBe(
      "Bearer signed-in-token",
    )
  })
})
