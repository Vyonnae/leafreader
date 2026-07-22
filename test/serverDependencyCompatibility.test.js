import { readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
)

describe("Vercel server dependency compatibility", () => {
  test("pins sanitize-html before its CommonJS entrypoint required ESM-only htmlparser2", () => {
    expect(packageJson.dependencies["sanitize-html"]).toBe("2.17.5")
  })
})
