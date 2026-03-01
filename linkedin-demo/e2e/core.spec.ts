import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsGuest } from "./helpers";

async function recoverFeedIfNeeded(page: Page) {
  const refreshButton = page.getByRole("button", { name: "Refresh" });
  if (await refreshButton.isVisible().catch(() => false)) {
    await refreshButton.click();
  }
}

async function waitForFeedPosts(page: Page) {
  await recoverFeedIfNeeded(page);
  await expect(page.getByPlaceholder("Start a post")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[id^="post-"]').first()).toBeVisible({ timeout: 15_000 });
}

async function getVisibleLikeCount(post: Locator) {
  const countLabels = post.locator("h4").filter({ hasText: /^\d+$/ });
  const visibleCountLabels = await countLabels.all();

  for (const label of visibleCountLabels) {
    if (await label.isVisible()) {
      const countText = (await label.textContent())?.trim() ?? "0";
      return Number.parseInt(countText, 10);
    }
  }

  return 0;
}

function getPostByDescription(page: Page, description: string) {
  return page
    .locator('[id^="post-"]')
    .filter({ has: page.getByText(description, { exact: true }) })
    .first();
}

async function createTextPost(page: Page, description: string) {
  await recoverFeedIfNeeded(page);
  await page.getByPlaceholder("Start a post").fill(description);
  await page.getByRole("button", { name: "Post" }).click();
  await recoverFeedIfNeeded(page);
  await expect(getPostByDescription(page, description)).toBeVisible({ timeout: 15_000 });
}

async function openOwnPostMenu(post: Locator) {
  await post.locator("svg").first().click();
}

async function deletePostIfPresent(page: Page, description: string) {
  const post = getPostByDescription(page, description);
  if ((await post.count()) === 0) {
    return;
  }

  await openOwnPostMenu(post);
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(post).toHaveCount(0);
}

test("Guest login", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: /Continue as Guest/i })).toBeVisible();
  await page.getByRole("button", { name: /Continue as Guest/i }).click();

  await expect(page.getByPlaceholder("Start a post")).toBeVisible();
  await expect(page.getByRole("button", { name: "Post" })).toBeVisible();
  await waitForFeedPosts(page);

  expect(await page.locator('[id^="post-"]').count()).toBeGreaterThan(0);
});

test.describe("Feed", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsGuest(page);
  });

  test("Feed loads posts", async ({ page }) => {
    await waitForFeedPosts(page);

    const posts = page.locator('[id^="post-"]');
    expect(await posts.count()).toBeGreaterThanOrEqual(2);

    const firstPost = posts.first();
    await expect(firstPost.getByRole("heading").first()).toBeVisible();
    await expect(firstPost.getByText(/ago$/i).first()).toBeVisible();

    const firstPostDescription = (await firstPost.locator("p").nth(1).textContent())?.trim() ?? "";
    expect(firstPostDescription.length).toBeGreaterThan(0);
  });

  test("Like a post", async ({ page }) => {
    await waitForFeedPosts(page);

    const firstPost = page.locator('[id^="post-"]').first();
    const likeAction = firstPost.getByText("Like", { exact: true });
    const initialLikeCount = await getVisibleLikeCount(firstPost);

    await likeAction.click();
    await expect(likeAction).toHaveCSS("color", "rgb(46, 125, 50)");
    await expect
      .poll(async () => getVisibleLikeCount(firstPost), { timeout: 10_000 })
      .toBe(initialLikeCount + 1);

    await likeAction.click();
    await expect(likeAction).not.toHaveCSS("color", "rgb(46, 125, 50)");
    await expect
      .poll(async () => getVisibleLikeCount(firstPost), { timeout: 10_000 })
      .toBe(initialLikeCount);
  });

  test("Comment on a post", async ({ page }) => {
    await waitForFeedPosts(page);

    const firstPost = page.locator('[id^="post-"]').first();
    const commentBody = `Test comment from e2e ${Date.now()}`;

    await firstPost.getByText("Comment", { exact: true }).click();
    await firstPost.getByPlaceholder("Add a comment").fill(commentBody);
    await firstPost.getByRole("button", { name: "Send" }).click();

    const commentText = firstPost.getByText(commentBody, { exact: true });
    await expect(commentText).toBeVisible();

    const commentContent = commentText.locator("xpath=..");
    await expect(commentContent.getByRole("heading", { level: 5 })).toBeVisible();

    await commentContent.getByRole("img", { name: "Delete comment" }).click();
    await expect(commentText).toHaveCount(0);
  });

  test("Create a post", async ({ page }) => {
    await waitForFeedPosts(page);

    const postBody = `E2E test post ${Date.now()}`;

    await createTextPost(page, postBody);

    const createdPost = getPostByDescription(page, postBody);
    await expect(createdPost).toBeVisible();
    await expect(createdPost.getByText(postBody, { exact: true })).toBeVisible();

    await deletePostIfPresent(page, postBody);
  });

  test("Edit a post", async ({ page }) => {
    await waitForFeedPosts(page);

    const originalText = `E2E editable post ${Date.now()}`;
    const editedText = `Edited e2e post ${Date.now()}`;

    await createTextPost(page, originalText);

    const originalPost = getPostByDescription(page, originalText);
    await openOwnPostMenu(originalPost);
    await page.getByRole("menuitem", { name: "Edit" }).click();

    await originalPost.getByLabel("Edit post description").fill(editedText);
    await originalPost.getByRole("button", { name: "Save" }).click();

    const editedPost = getPostByDescription(page, editedText);
    await expect(editedPost).toBeVisible();
    await expect(editedPost.getByText(editedText, { exact: true })).toBeVisible();
    await expect(page.getByText(originalText, { exact: true })).toHaveCount(0);

    await deletePostIfPresent(page, editedText);
  });
});
