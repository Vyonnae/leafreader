// @vitest-environment jsdom
import { describe, expect, test } from "vitest"
import router from "../src/router/index.js"

describe("router", () => {
  test("resolves legal pages before the catch-all redirect", () => {
    expect(router.resolve("/privacy").name).toBe("privacy")
    expect(router.resolve("/terms").name).toBe("terms")
  })
})
