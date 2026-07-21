import { describe, expect, test } from "vitest"
import { isBlockedAddress, normalizeFeedUrl } from "../api/_lib/urlSecurity.js"

describe("normalizeFeedUrl", () => {
  test("accepts plain http and https feed URLs", () => {
    expect(normalizeFeedUrl("https://example.com/feed.xml")).toBe("https://example.com/feed.xml")
    expect(normalizeFeedUrl("http://example.com/rss")).toBe("http://example.com/rss")
  })

  test("rejects non-http schemes and credentialed URLs", () => {
    expect(() => normalizeFeedUrl("file:///etc/passwd")).toThrow(/http/i)
    expect(() => normalizeFeedUrl("javascript:alert(1)")).toThrow(/http/i)
    expect(() => normalizeFeedUrl("https://user:pass@example.com/feed.xml")).toThrow(/credentials/i)
  })

  test("rejects localhost and intranet-style hostnames before DNS lookup", () => {
    expect(() => normalizeFeedUrl("http://localhost/feed.xml")).toThrow(/local/i)
    expect(() => normalizeFeedUrl("http://printer.local/rss")).toThrow(/local/i)
  })
})

describe("isBlockedAddress", () => {
  test("blocks private, loopback, link-local, multicast, and metadata targets", () => {
    expect(isBlockedAddress("127.0.0.1")).toBe(true)
    expect(isBlockedAddress("10.0.0.4")).toBe(true)
    expect(isBlockedAddress("172.16.0.1")).toBe(true)
    expect(isBlockedAddress("192.168.1.1")).toBe(true)
    expect(isBlockedAddress("169.254.169.254")).toBe(true)
    expect(isBlockedAddress("224.0.0.1")).toBe(true)
    expect(isBlockedAddress("::1")).toBe(true)
    expect(isBlockedAddress("fc00::1")).toBe(true)
    expect(isBlockedAddress("fe80::1")).toBe(true)
  })

  test("allows public routable addresses", () => {
    expect(isBlockedAddress("93.184.216.34")).toBe(false)
    expect(isBlockedAddress("2606:2800:220:1:248:1893:25c8:1946")).toBe(false)
  })
})
