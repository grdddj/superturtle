import { expect, type Page } from "@playwright/test";

export async function loginAsGuest(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Guest" }).click();
  await expect(page.getByText("Start a post")).toBeVisible();
}
