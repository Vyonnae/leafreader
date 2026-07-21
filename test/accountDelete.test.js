import { describe, expect, test } from "vitest"
import { assertDeletePhrase, pickVerifiedUserId } from "../api/account.js"

describe("account deletion helpers", () => {
  test("requires the exact DELETE phrase", () => {
    expect(() => assertDeletePhrase("delete")).toThrow(/DELETE/)
    expect(assertDeletePhrase("DELETE")).toBe(true)
  })

  test("uses only the verified auth user id", () => {
    expect(pickVerifiedUserId({ id: "auth-user" }, { userId: "body-user" })).toBe("auth-user")
  })
})
