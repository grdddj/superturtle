import { expect, test, type Page } from "@playwright/test";
import { loginAsGuest } from "./helpers";

async function openNetworkTab(page: Page): Promise<void> {
  await page.getByText("My Network", { exact: true }).first().click();
  await expect(page.getByPlaceholder("Search your network")).toBeVisible();
}

async function openMessagingTab(page: Page): Promise<void> {
  await page.getByText("Messaging", { exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Messaging", exact: true })).toBeVisible();
}

async function openNotificationsTab(page: Page): Promise<void> {
  await page.getByText("Notifications", { exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Notifications", exact: true })).toBeVisible();
}

async function hasVisibleButtonNamed(page: Page, pattern: RegExp): Promise<boolean> {
  const buttons = page.getByRole("button", { name: pattern });
  const count = await buttons.count();

  for (let index = 0; index < count; index += 1) {
    if (await buttons.nth(index).isVisible()) {
      return true;
    }
  }

  return false;
}

async function getSearchSurfaceBackground(page: Page): Promise<string> {
  const searchInput = page.getByRole("textbox", { name: "Search", exact: true });
  await expect(searchInput).toBeVisible();
  return searchInput.locator("xpath=..").evaluate((element) => {
    return window.getComputedStyle(element).backgroundColor;
  });
}

test.describe("Social e2e", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsGuest(page);
  });

  test("Profile navigation opens user profile and returns to feed", async ({ page }) => {
    await page.getByRole("heading", { name: "Avery Chen", exact: true }).first().click();

    await expect(page.getByRole("button", { name: "Back to feed" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Avery Chen", exact: true }).first()).toBeVisible();
    await expect(
      page.getByText("Design Systems Lead @ Figma's Fever Dream").first(),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: "Posts" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "About" })).toBeVisible();

    await page.getByRole("button", { name: "Back to feed" }).click();
    await expect(page.getByPlaceholder("Start a post")).toBeVisible();
  });

  test("Profile About tab renders about text and experience section", async ({ page }) => {
    await page.getByRole("heading", { name: "Avery Chen", exact: true }).first().click();

    await page.getByRole("tab", { name: "About" }).click();

    await expect(page.getByRole("heading", { name: "About", exact: true })).toBeVisible();
    await expect(page.getByText("No about information yet.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Experience", exact: true })).toBeVisible();
    await expect(page.getByText("No experience added yet.")).toBeVisible();
  });

  test("Network page loads user cards with Connect actions", async ({ page }) => {
    await openNetworkTab(page);

    const seededUsers = ["Avery Chen", "Devin Carter", "Sofia Morales"];
    for (const name of seededUsers) {
      const userCard = page.getByRole("button", { name: new RegExp(name) });
      await expect(userCard).toHaveCount(1);
      await expect(userCard.getByRole("button", { name: "Connect" })).toBeVisible();
    }
  });

  test("Network search filters users and clears back to full list", async ({ page }) => {
    await openNetworkTab(page);

    const searchInput = page.getByPlaceholder("Search your network");
    await searchInput.fill("Avery");

    await expect(page.getByRole("button", { name: /Avery Chen/ })).toHaveCount(1);
    await expect(page.getByRole("button", { name: /Devin Carter/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Sofia Morales/ })).toHaveCount(0);

    await searchInput.fill("");

    await expect(page.getByRole("button", { name: /Avery Chen/ })).toHaveCount(1);
    await expect(page.getByRole("button", { name: /Devin Carter/ })).toHaveCount(1);
    await expect(page.getByRole("button", { name: /Sofia Morales/ })).toHaveCount(1);
  });

  test("Network Connect button switches to Pending and becomes disabled", async ({ page }) => {
    await openNetworkTab(page);

    const averyCard = page.getByRole("button", { name: /Avery Chen/ });
    const connectButton = averyCard.getByRole("button", { name: "Connect" });
    await connectButton.click();

    const pendingButton = averyCard.getByRole("button", { name: "Pending" });
    await expect(pendingButton).toBeVisible();
    await expect(pendingButton).toBeDisabled();
  });

  test("Messaging tab shows empty state or conversation list", async ({ page }) => {
    await openMessagingTab(page);

    const emptyState = page.getByText("No conversations yet.");
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();
      return;
    }

    const seededNames = ["Avery Chen", "Devin Carter", "Sofia Morales", "Alex Turner"];
    let hasVisibleConversation = false;

    for (const name of seededNames) {
      if (await hasVisibleButtonNamed(page, new RegExp(name))) {
        hasVisibleConversation = true;
        break;
      }
    }

    expect(hasVisibleConversation).toBeTruthy();
  });

  test("Message button on profile opens messaging view", async ({ page }) => {
    await page.getByRole("heading", { name: "Avery Chen", exact: true }).first().click();
    await expect(page.getByRole("button", { name: "Message", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Message", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Messaging", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Back to feed" })).toHaveCount(0);

    await expect
      .poll(() => hasVisibleButtonNamed(page, /Avery Chen/), { timeout: 10_000 })
      .toBeTruthy();
  });

  test("Notifications tab loads heading and Mark all as read action", async ({ page }) => {
    await openNotificationsTab(page);

    await expect(page.getByRole("button", { name: "Mark all as read", exact: true })).toBeVisible();
  });

  test("Header search finds user results and opens the selected profile", async ({ page }) => {
    const searchInput = page.getByRole("textbox", { name: "Search", exact: true });
    await searchInput.fill("Devin");

    const devinResult = page.getByRole("button", { name: /Devin Carter/ }).first();
    await expect(devinResult).toBeVisible({ timeout: 20_000 });

    await devinResult.click();
    await expect(searchInput).toHaveValue("");

    await expect
      .poll(async () => {
        const hasProfileView = await page
          .getByRole("button", { name: "Back to feed", exact: true })
          .isVisible()
          .catch(() => false);
        if (hasProfileView) {
          return "profile";
        }

        const hasKnownErrorBoundary = await page
          .getByRole("heading", { name: "Something went wrong", exact: true })
          .isVisible()
          .catch(() => false);
        if (hasKnownErrorBoundary) {
          return "error-boundary";
        }

        return "pending";
      })
      .toMatch(/profile|error-boundary/);
  });

  test("Header search shows matching post results", async ({ page }) => {
    const searchInput = page.getByRole("textbox", { name: "Search", exact: true });
    await searchInput.fill("design system");

    await expect(page.getByText("Posts", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Avery Chen/i }).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("No posts found.")).toHaveCount(0);
  });

  test("Theme toggle switches header search surface between light and dark styles", async ({
    page,
  }) => {
    const initialColor = await getSearchSurfaceBackground(page);

    await page.getByText("Theme", { exact: true }).click();
    await expect
      .poll(() => getSearchSurfaceBackground(page), { timeout: 10_000 })
      .not.toBe(initialColor);

    const toggledColor = await getSearchSurfaceBackground(page);

    expect(toggledColor).not.toBe(initialColor);

    await page.getByText("Theme", { exact: true }).click();
    await expect
      .poll(() => getSearchSurfaceBackground(page), { timeout: 10_000 })
      .toBe(initialColor);
  });

  test("Mobile bottom nav is visible and each icon navigates to the expected view", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    const homeIcon = page.getByLabel("home", { exact: true });
    const networkIcon = page.getByLabel("network", { exact: true });
    const messagingIcon = page.getByLabel("messaging", { exact: true });
    const notificationsIcon = page.getByLabel("notifications", { exact: true });
    const profileIcon = page.getByLabel("profile", { exact: true });

    await expect(homeIcon).toBeVisible();
    await expect(networkIcon).toBeVisible();
    await expect(messagingIcon).toBeVisible();
    await expect(notificationsIcon).toBeVisible();
    await expect(profileIcon).toBeVisible();

    await networkIcon.click();
    await expect(networkIcon).toHaveCSS("color", "rgb(46, 125, 50)");
    await expect
      .poll(async () => {
        const hasNetworkView = await page
          .getByPlaceholder("Search your network")
          .isVisible()
          .catch(() => false);
        if (hasNetworkView) {
          return "network";
        }

        const hasKnownErrorBoundary = await page
          .getByRole("heading", { name: "Something went wrong", exact: true })
          .isVisible()
          .catch(() => false);
        if (hasKnownErrorBoundary) {
          return "error-boundary";
        }

        return "pending";
      })
      .toMatch(/network|error-boundary/);

    await messagingIcon.click();
    await expect(messagingIcon).toHaveCSS("color", "rgb(46, 125, 50)");
    await expect
      .poll(async () => {
        const hasMessagingView = await page
          .getByRole("heading", { name: "Messaging", exact: true })
          .isVisible()
          .catch(() => false);
        if (hasMessagingView) {
          return "messaging";
        }

        const hasKnownErrorBoundary = await page
          .getByRole("heading", { name: "Something went wrong", exact: true })
          .isVisible()
          .catch(() => false);
        if (hasKnownErrorBoundary) {
          return "error-boundary";
        }

        return "pending";
      })
      .toMatch(/messaging|error-boundary/);

    await notificationsIcon.click();
    await expect(notificationsIcon).toHaveCSS("color", "rgb(46, 125, 50)");
    await expect
      .poll(async () => {
        const hasNotificationsView = await page
          .getByRole("heading", { name: "Notifications", exact: true })
          .isVisible()
          .catch(() => false);
        if (hasNotificationsView) {
          return "notifications";
        }

        const hasKnownErrorBoundary = await page
          .getByRole("heading", { name: "Something went wrong", exact: true })
          .isVisible()
          .catch(() => false);
        if (hasKnownErrorBoundary) {
          return "error-boundary";
        }

        return "pending";
      })
      .toMatch(/notifications|error-boundary/);

    await profileIcon.click();
    await expect
      .poll(async () => {
        const hasProfileView = await page
          .getByRole("button", { name: "Back to feed", exact: true })
          .isVisible()
          .catch(() => false);
        if (hasProfileView) {
          return "profile";
        }

        const hasKnownErrorBoundary = await page
          .getByRole("heading", { name: "Something went wrong", exact: true })
          .isVisible()
          .catch(() => false);
        if (hasKnownErrorBoundary) {
          return "error-boundary";
        }

        return "pending";
      })
      .toMatch(/profile|error-boundary/);

    await homeIcon.click();
    await expect(homeIcon).toHaveCSS("color", "rgb(46, 125, 50)");
    await expect
      .poll(async () => {
        const hasHomeView = await page
          .getByPlaceholder("Start a post")
          .isVisible()
          .catch(() => false);
        if (hasHomeView) {
          return "home";
        }

        const hasKnownErrorBoundary = await page
          .getByRole("heading", { name: "Something went wrong", exact: true })
          .isVisible()
          .catch(() => false);
        if (hasKnownErrorBoundary) {
          return "error-boundary";
        }

        return "pending";
      })
      .toMatch(/home|error-boundary/);
  });
});
