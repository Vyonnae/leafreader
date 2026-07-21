import { describe, expect, test, vi } from "vitest"

vi.mock("../src/services/apiClient", () => ({
  ApiError: class ApiError extends Error {
    constructor(message, details = {}) {
      super(message)
      this.status = details.status
    }
  },
  ApiNetworkError: class ApiNetworkError extends Error {},
  ApiTimeoutError: class ApiTimeoutError extends Error {},
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn()
  }
}))

const { apiClient, ApiError } = await import("../src/services/apiClient")
const { deleteAccount, exportOpml, importOpml, discoverFeed, getLibrary, removeSubscription, userMessageForFeedError } = await import("../src/services/feedService")

describe("feedService", () => {
  test("calls real RSS API endpoints", async () => {
    apiClient.post.mockResolvedValueOnce({ feed: { title: "Example" } })
    apiClient.get.mockResolvedValueOnce({ articles: [] })
    apiClient.delete.mockResolvedValueOnce(null)

    await discoverFeed("https://example.com/rss")
    await getLibrary({ limit: 10 })
    await removeSubscription("sub_1")

    expect(apiClient.post).toHaveBeenCalledWith("/api/feeds/discover", { url: "https://example.com/rss" })
    expect(apiClient.get).toHaveBeenCalledWith("/api/library?limit=10")
    expect(apiClient.delete).toHaveBeenCalledWith("/api/subscriptions/remove", { body: { subscriptionId: "sub_1" } })
  })

  test("calls OPML and account endpoints", async () => {
    apiClient.post.mockResolvedValueOnce({ imported: 1 })
    apiClient.get.mockResolvedValueOnce("<opml></opml>")
    apiClient.delete.mockResolvedValueOnce(null)

    await importOpml([{ feedUrl: "https://example.com/rss" }])
    await exportOpml()
    await deleteAccount("DELETE")

    expect(apiClient.post).toHaveBeenCalledWith("/api/opml/import", { feeds: [{ feedUrl: "https://example.com/rss" }] })
    expect(apiClient.get).toHaveBeenCalledWith("/api/opml/export", { headers: { Accept: "application/xml" } })
    expect(apiClient.delete).toHaveBeenCalledWith("/api/account", { body: { confirmation: "DELETE" } })
  })

  test("maps common API failures to reader-facing messages", () => {
    expect(userMessageForFeedError(new ApiError("nope", { status: 401 }))).toMatch(/sign in/i)
    expect(userMessageForFeedError(new ApiError("duplicate", { status: 409 }))).toMatch(/already/i)
    expect(userMessageForFeedError(new ApiError("slow", { status: 429 }))).toMatch(/recently/i)
  })
})
