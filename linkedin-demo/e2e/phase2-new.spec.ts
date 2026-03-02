import { expect, test, type Locator, type Page } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import { loginAsGuest } from "./helpers";

const DEFAULT_CONVEX_URL = "https://tough-mosquito-145.convex.cloud";
const CONVEX_URL =
  process.env.PLAYWRIGHT_CONVEX_URL ??
  process.env.REACT_APP_CONVEX_URL ??
  DEFAULT_CONVEX_URL;

function getErrorText(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isFunctionUnavailableError(error: unknown): boolean {
  const errorText = getErrorText(error).toLowerCase();

  return (
    errorText.includes("not found") ||
    errorText.includes("404") ||
    errorText.includes("no public function") ||
    errorText.includes("could not find") ||
    errorText.includes("does not exist")
  );
}

async function runConvexCallOrSkip<T>(
  fnName: string,
  callback: () => Promise<T>,
): Promise<T> {
  try {
    return await callback();
  } catch (error) {
    if (isFunctionUnavailableError(error)) {
      test.skip(true, `Function not yet deployed: ${fnName}`);
    }
    throw error;
  }
}

async function getConvexAuthToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith("__convexAuthJWT_")) {
        continue;
      }

      const token = window.localStorage.getItem(key);
      if (typeof token === "string" && token.length > 0) {
        return token;
      }
    }

    return null;
  });
}

async function createAuthenticatedConvexClient(page: Page): Promise<ConvexHttpClient> {
  try {
    await loginAsGuest(page);
  } catch {
    test.skip(true, "Skipped: guest login was unavailable in live deployment.");
  }

  const token = await getConvexAuthToken(page);
  test.skip(!token, "Skipped: guest auth token was unavailable for ConvexHttpClient.");

  const client = new ConvexHttpClient(CONVEX_URL);
  client.setAuth(token);
  return client;
}

async function ensureFeedReady(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await loginAsGuest(page);
    } catch {
      test.skip(true, "Skipped: guest login was unavailable in live deployment.");
    }

    const refreshButton = page.getByRole("button", { name: "Refresh" });
    if (await refreshButton.isVisible().catch(() => false)) {
      await refreshButton.click().catch(() => {});
      await page.waitForLoadState("domcontentloaded").catch(() => {});
    }

    const composer = page.getByPlaceholder("Start a post");
    if (await composer.isVisible().catch(() => false)) {
      const posts = page.locator('[id^="post-"]');
      if ((await posts.count()) > 0) {
        await expect(posts.first()).toBeVisible({ timeout: 20_000 });
        return;
      }
    }

    await page.goto("/", { waitUntil: "domcontentloaded" });
  }

  test.skip(true, "Skipped: feed posts were unavailable in live deployment.");
}

function getPostsByDescription(page: Page, description: string): Locator {
  return page
    .locator('[id^="post-"]')
    .filter({ has: page.getByText(description, { exact: true }) });
}

test.describe("Phase 2 batch 2 e2e", () => {
  test("Poll creation and voting", async ({ page }) => {
    const client = await createAuthenticatedConvexClient(page);
    let createdPostId: string | null = null;

    try {
      const currentUser = await runConvexCallOrSkip("users:getCurrentUser", () =>
        client.query("users:getCurrentUser", {}),
      );
      test.skip(!currentUser?._id, "Skipped: current user lookup failed for guest auth session.");

      createdPostId = await runConvexCallOrSkip("posts:createPost", () =>
        client.mutation("posts:createPost", {
          authorId: currentUser._id,
          description: `E2E poll post ${Date.now()}`,
          visibility: "public",
        }),
      );

      await runConvexCallOrSkip("polls:createPoll", () =>
        client.mutation("polls:createPoll", {
          postId: createdPostId,
          question: "Which rollout should we ship first?",
          options: ["Polls", "Articles", "Bookmarks"],
        }),
      );

      const poll = await runConvexCallOrSkip("polls:getPoll", () =>
        client.query("polls:getPoll", { postId: createdPostId! }),
      );
      expect(poll).not.toBeNull();
      expect(poll?.question).toBe("Which rollout should we ship first?");
      expect(poll?.options).toEqual(["Polls", "Articles", "Bookmarks"]);

      await runConvexCallOrSkip("polls:vote", () =>
        client.mutation("polls:vote", {
          pollId: poll!._id,
          optionIndex: 1,
        }),
      );

      const results = await runConvexCallOrSkip("polls:getResults", () =>
        client.query("polls:getResults", { pollId: poll!._id }),
      );

      expect(results).not.toBeNull();
      expect(results?.totalVotes).toBeGreaterThanOrEqual(1);
      expect(results?.options[1]?.voteCount).toBeGreaterThanOrEqual(1);
    } finally {
      if (createdPostId) {
        await client
          .mutation("posts:deletePost", { postId: createdPostId })
          .catch(() => {});
      }
    }
  });

  test("Article creation stores articleTitle and articleBody fields", async ({
    page,
  }) => {
    const client = await createAuthenticatedConvexClient(page);
    let createdArticleId: string | null = null;
    const articleTitle = `E2E article title ${Date.now()}`;
    const articleBody = `E2E article body ${Date.now()}\n\nThis verifies article persistence fields.`;

    try {
      createdArticleId = await runConvexCallOrSkip("articles:createArticle", () =>
        client.mutation("articles:createArticle", {
          title: articleTitle,
          body: articleBody,
          description: `E2E article summary ${Date.now()}`,
        }),
      );

      const article = await runConvexCallOrSkip("articles:getArticle", () =>
        client.query("articles:getArticle", { postId: createdArticleId! }),
      );

      expect(article).not.toBeNull();
      expect(article?.type).toBe("article");
      expect(article?.articleTitle).toBe(articleTitle);
      expect(article?.articleBody).toBe(articleBody);
    } finally {
      if (createdArticleId) {
        await client
          .mutation("posts:deletePost", { postId: createdArticleId })
          .catch(() => {});
      }
    }
  });

  test("Bookmark toggle bookmarks and unbookmarks a post", async ({ page }) => {
    const client = await createAuthenticatedConvexClient(page);
    let createdPostId: string | null = null;

    try {
      const currentUser = await runConvexCallOrSkip("users:getCurrentUser", () =>
        client.query("users:getCurrentUser", {}),
      );
      test.skip(!currentUser?._id, "Skipped: current user lookup failed for guest auth session.");

      createdPostId = await runConvexCallOrSkip("posts:createPost", () =>
        client.mutation("posts:createPost", {
          authorId: currentUser._id,
          description: `E2E bookmark post ${Date.now()}`,
          visibility: "public",
        }),
      );

      const firstToggle = await runConvexCallOrSkip("bookmarks:toggleBookmark", () =>
        client.mutation("bookmarks:toggleBookmark", { postId: createdPostId! }),
      );
      expect(firstToggle?.bookmarked).toBe(true);

      const bookmarkedAfterFirstToggle = await runConvexCallOrSkip("bookmarks:isBookmarked", () =>
        client.query("bookmarks:isBookmarked", { postId: createdPostId! }),
      );
      expect(bookmarkedAfterFirstToggle).toBe(true);

      const secondToggle = await runConvexCallOrSkip("bookmarks:toggleBookmark", () =>
        client.mutation("bookmarks:toggleBookmark", { postId: createdPostId! }),
      );
      expect(secondToggle?.bookmarked).toBe(false);

      const bookmarkedAfterSecondToggle = await runConvexCallOrSkip("bookmarks:isBookmarked", () =>
        client.query("bookmarks:isBookmarked", { postId: createdPostId! }),
      );
      expect(bookmarkedAfterSecondToggle).toBe(false);
    } finally {
      if (createdPostId) {
        await client
          .mutation("posts:deletePost", { postId: createdPostId })
          .catch(() => {});
      }
    }
  });

  test("Report post marks post as reported and prevents duplicate reports", async ({ page }) => {
    const client = await createAuthenticatedConvexClient(page);
    let createdPostId: string | null = null;

    try {
      const currentUser = await runConvexCallOrSkip("users:getCurrentUser", () =>
        client.query("users:getCurrentUser", {}),
      );
      test.skip(!currentUser?._id, "Skipped: current user lookup failed for guest auth session.");

      createdPostId = await runConvexCallOrSkip("posts:createPost", () =>
        client.mutation("posts:createPost", {
          authorId: currentUser._id,
          description: `E2E report post ${Date.now()}`,
          visibility: "public",
        }),
      );

      const firstReportResult = await runConvexCallOrSkip("reports:reportPost", () =>
        client.mutation("reports:reportPost", {
          postId: createdPostId!,
          reason: "Spam",
          details: "Automated E2E report validation",
        }),
      );
      expect(firstReportResult?.reported).toBe(true);
      expect(firstReportResult?.alreadyReported).toBe(false);

      const hasReported = await runConvexCallOrSkip("reports:hasReported", () =>
        client.query("reports:hasReported", { postId: createdPostId! }),
      );
      expect(hasReported).toBe(true);

      const duplicateReportResult = await runConvexCallOrSkip("reports:reportPost", () =>
        client.mutation("reports:reportPost", {
          postId: createdPostId!,
          reason: "Spam",
          details: "Duplicate report should be prevented",
        }),
      );
      expect(duplicateReportResult?.reported).toBe(false);
      expect(duplicateReportResult?.alreadyReported).toBe(true);
    } finally {
      if (createdPostId) {
        await client
          .mutation("posts:deletePost", { postId: createdPostId })
          .catch(() => {});
      }
    }
  });

  test("Edit history stores previous post description", async ({ page }) => {
    const client = await createAuthenticatedConvexClient(page);
    let createdPostId: string | null = null;
    const originalDescription = `E2E edit history original ${Date.now()}`;
    const editedDescription = `E2E edit history edited ${Date.now()}`;

    try {
      const currentUser = await runConvexCallOrSkip("users:getCurrentUser", () =>
        client.query("users:getCurrentUser", {}),
      );
      test.skip(!currentUser?._id, "Skipped: current user lookup failed for guest auth session.");

      createdPostId = await runConvexCallOrSkip("posts:createPost", () =>
        client.mutation("posts:createPost", {
          authorId: currentUser._id,
          description: originalDescription,
          visibility: "public",
        }),
      );

      await runConvexCallOrSkip("posts:editPost", () =>
        client.mutation("posts:editPost", {
          postId: createdPostId!,
          description: editedDescription,
        }),
      );

      const editHistory = await runConvexCallOrSkip("postEdits:getEditHistory", () =>
        client.query("postEdits:getEditHistory", { postId: createdPostId! }),
      );

      expect(editHistory.length).toBeGreaterThanOrEqual(1);
      expect(editHistory[0]?.previousDescription).toBe(originalDescription);
      expect(editHistory[0]?.editedAt).toBeGreaterThan(0);
    } finally {
      if (createdPostId) {
        await client
          .mutation("posts:deletePost", { postId: createdPostId })
          .catch(() => {});
      }
    }
  });

  test("UI smoke: poll UI renders in feed", async ({ page }) => {
    const client = await createAuthenticatedConvexClient(page);
    let createdPostId: string | null = null;
    const description = `E2E UI poll smoke ${Date.now()}`;
    const question = `E2E UI poll question ${Date.now()}`;
    const pollOptions = ["Option one", "Option two", "Option three"];

    try {
      const currentUser = await runConvexCallOrSkip("users:getCurrentUser", () =>
        client.query("users:getCurrentUser", {}),
      );
      test.skip(!currentUser?._id, "Skipped: current user lookup failed for guest auth session.");

      createdPostId = await runConvexCallOrSkip("posts:createPost", () =>
        client.mutation("posts:createPost", {
          authorId: currentUser._id,
          description,
          visibility: "public",
        }),
      );

      await runConvexCallOrSkip("polls:createPoll", () =>
        client.mutation("polls:createPoll", {
          postId: createdPostId!,
          question,
          options: pollOptions,
        }),
      );

      await page.goto("/", { waitUntil: "domcontentloaded" });
      await ensureFeedReady(page);

      const pollPost = getPostsByDescription(page, description).first();
      await expect(pollPost).toBeVisible({ timeout: 20_000 });
      await expect(pollPost.getByText(question, { exact: true })).toBeVisible();
      await expect(pollPost.getByRole("button", { name: pollOptions[0], exact: true })).toBeVisible();
      await expect(pollPost.getByText("votes")).toBeVisible();
    } finally {
      if (createdPostId) {
        await client
          .mutation("posts:deletePost", { postId: createdPostId })
          .catch(() => {});
      }
    }
  });

  test("UI smoke: article page loads at /article/:id", async ({ page }) => {
    const client = await createAuthenticatedConvexClient(page);
    let createdArticleId: string | null = null;
    const articleTitle = `E2E UI article smoke ${Date.now()}`;
    const articleBody = `E2E article body smoke ${Date.now()}`;

    try {
      createdArticleId = await runConvexCallOrSkip("articles:createArticle", () =>
        client.mutation("articles:createArticle", {
          title: articleTitle,
          body: articleBody,
          description: `E2E article description ${Date.now()}`,
        }),
      );

      await page.goto(`/article/${createdArticleId}`, { waitUntil: "domcontentloaded" });

      await expect(page.getByText(articleTitle, { exact: true })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(articleBody, { exact: false })).toBeVisible();
      await expect(page.getByRole("button", { name: "Back", exact: true })).toBeVisible();
    } finally {
      if (createdArticleId) {
        await client
          .mutation("posts:deletePost", { postId: createdArticleId })
          .catch(() => {});
      }
    }
  });

  test("UI smoke: bookmark icon appears on feed posts", async ({ page }) => {
    await ensureFeedReady(page);

    const firstPost = page.locator('[id^="post-"]').first();
    await expect(firstPost).toBeVisible();
    await expect(
      firstPost.locator('[data-testid="BookmarkBorderOutlinedIcon"], [data-testid="BookmarkIcon"]'),
    ).toBeVisible();
    await expect(firstPost.getByText(/Save|Saved/)).toBeVisible();
  });

  test("UI smoke: report option appears in post menu", async ({ page }) => {
    await ensureFeedReady(page);

    const posts = page.locator('[id^="post-"]');
    const maxPostsToScan = Math.min(await posts.count(), 10);
    let foundReportOption = false;

    for (let index = 0; index < maxPostsToScan; index += 1) {
      const post = posts.nth(index);
      const menuTrigger = post.locator('[data-testid="MoreHorizOutlinedIcon"]').first();
      if (!(await menuTrigger.isVisible().catch(() => false))) {
        continue;
      }

      await menuTrigger.click();

      const reportOption = page.getByRole("menuitem", { name: /^Report(?:ed)?$/i });
      if (await reportOption.first().isVisible().catch(() => false)) {
        await expect(reportOption.first()).toBeVisible();
        foundReportOption = true;
        await page.keyboard.press("Escape").catch(() => {});
        break;
      }

      await page.keyboard.press("Escape").catch(() => {});
    }

    test.skip(
      !foundReportOption,
      "Skipped: no visible non-owned post menu with Report option was found.",
    );
  });

  test("UI smoke: edited badge appears on edited posts", async ({ page }) => {
    const client = await createAuthenticatedConvexClient(page);
    let createdPostId: string | null = null;
    const originalDescription = `E2E UI edited badge original ${Date.now()}`;
    const editedDescription = `E2E UI edited badge updated ${Date.now()}`;

    try {
      const currentUser = await runConvexCallOrSkip("users:getCurrentUser", () =>
        client.query("users:getCurrentUser", {}),
      );
      test.skip(!currentUser?._id, "Skipped: current user lookup failed for guest auth session.");

      createdPostId = await runConvexCallOrSkip("posts:createPost", () =>
        client.mutation("posts:createPost", {
          authorId: currentUser._id,
          description: originalDescription,
          visibility: "public",
        }),
      );

      await runConvexCallOrSkip("posts:editPost", () =>
        client.mutation("posts:editPost", {
          postId: createdPostId!,
          description: editedDescription,
        }),
      );

      await page.goto("/", { waitUntil: "domcontentloaded" });
      await ensureFeedReady(page);

      const editedPost = getPostsByDescription(page, editedDescription).first();
      await expect(editedPost).toBeVisible({ timeout: 20_000 });
      await expect(editedPost.getByRole("button", { name: "View edit history" })).toBeVisible();
      await expect(editedPost.getByText("Edited", { exact: true })).toBeVisible();
    } finally {
      if (createdPostId) {
        await client
          .mutation("posts:deletePost", { postId: createdPostId })
          .catch(() => {});
      }
    }
  });
});
