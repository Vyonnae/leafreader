import { expect, test } from "@playwright/test"

test("Guest can reach auth and continue back to the reader", async ({ page }) => {
  await page.goto("/app")
  await expect(page.getByText("LeafReader").first()).toBeVisible()

  await page.getByRole("button", { name: /sign in to sync/i }).click()
  await expect(page).toHaveURL(/\/auth/)

  await page.getByRole("button", { name: /continue as guest/i }).click()
  await expect(page).toHaveURL(/\/app/)
})

test("legal pages resolve", async ({ page }) => {
  await page.goto("/privacy")
  await expect(page.getByRole("heading", { name: /privacy policy/i })).toBeVisible()

  await page.goto("/terms")
  await expect(page.getByRole("heading", { name: /terms of use/i })).toBeVisible()
})
