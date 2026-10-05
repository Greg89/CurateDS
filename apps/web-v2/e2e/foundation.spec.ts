import { test, expect } from "@playwright/test";
import { signIn } from "./session";
import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { testSecret } from "../playwright.config";
import { expireAccessToken, readSession } from "../scripts/live-auth-smoke";

test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:3102/scenario/ok");
});

test("public landing and unauthenticated API boundary", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("worth");
  await expect(page.getByRole("link", { name: /Step into/ })).toHaveAttribute(
    "href",
    "/auth/login?returnTo=%2Fcollections",
  );
  expect((await request.get("/api/collections")).status()).toBe(401);
  const protectedPage = await request.get("/collections", { maxRedirects: 0 });
  expect(protectedPage.status()).toBe(307);
  expect(protectedPage.headers().location).toContain("/auth/login");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("expired tokens refresh and persist rotating credentials across requests", async ({
  context,
  request,
}) => {
  await signIn(context, { refreshToken: "fixture-refresh-0" });
  const origin = "http://127.0.0.1:3101";
  const auth = new Auth0Client({
    appBaseUrl: origin,
    domain: "test.invalid",
    clientId: "test-client",
    clientSecret: "test-client-secret",
    secret: testSecret,
  });
  await expireAccessToken(context, auth, origin, testSecret);
  expect(
    (await readSession(context, auth, origin))!.tokenSet.expiresAt,
  ).toBeLessThan(Date.now() / 1000);
  for (let index = 0; index < 3; index++) {
    const response = await context.request.get("/api/collections");
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    const body = await response.text();
    expect(body).toContain("The reading room");
    expect(body).not.toContain("fixture-access");
    expect(body).not.toContain("fixture-refresh");
  }
  expect(
    await (await request.get("http://127.0.0.1:3102/auth-stats")).json(),
  ).toEqual({ refreshCount: 2, revocationCount: 0, collectionRequests: 3 });
});

test("unrenewable sessions fail closed without calling the collection API", async ({
  context,
  request,
}) => {
  await signIn(context, { expired: true });
  const missingRefresh = await context.request.get("/api/collections");
  expect(missingRefresh.status()).toBe(401);
  expect(await missingRefresh.json()).toEqual({ code: "sign_in_required" });
  expect(
    await (await request.get("http://127.0.0.1:3102/auth-stats")).json(),
  ).toEqual({ refreshCount: 0, revocationCount: 0, collectionRequests: 0 });

  await request.post("http://127.0.0.1:3102/scenario/refresh-rejected");
  await signIn(context, { expired: true, refreshToken: "fixture-refresh-0" });
  const rejectedRefresh = await context.request.get("/api/collections");
  expect(rejectedRefresh.status()).toBe(401);
  expect(await rejectedRefresh.json()).toEqual({ code: "sign_in_required" });
  expect(rejectedRefresh.headers()["cache-control"]).toContain("no-store");
  expect(
    await (await request.get("http://127.0.0.1:3102/auth-stats")).json(),
  ).toEqual({ refreshCount: 1, revocationCount: 0, collectionRequests: 0 });
});

test("logout clears app access and redirects to the identity provider", async ({
  context,
  request,
}) => {
  await signIn(context, { refreshToken: "fixture-refresh-0" });
  expect((await context.request.get("/api/collections")).status()).toBe(200);
  const logout = await context.request.get("/auth/logout", { maxRedirects: 0 });
  expect(logout.status()).toBe(307);
  const destination = new URL(logout.headers().location);
  expect(destination.origin).toBe("https://test.invalid");
  expect(destination.pathname).toBe("/oidc/logout");
  expect(destination.searchParams.get("post_logout_redirect_uri")).toBe(
    "http://127.0.0.1:3101",
  );
  expect(
    (await context.cookies()).some((cookie) => cookie.name === "__session"),
  ).toBe(false);
  expect((await context.request.get("/api/collections")).status()).toBe(401);
  const protectedPage = await context.request.get("/collections", {
    maxRedirects: 0,
  });
  expect(protectedPage.status()).toBe(307);
  expect(protectedPage.headers().location).toContain("/auth/login");
  expect(
    await (await request.get("http://127.0.0.1:3102/auth-stats")).json(),
  ).toEqual({ refreshCount: 0, revocationCount: 1, collectionRequests: 1 });
});

test("signed-in collection shell, switching, and browser history", async ({
  page,
  context,
}, testInfo) => {
  await signIn(context);
  await page.goto("/collections");
  await page.getByRole("link", { name: /The reading room/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "The reading room",
  );
  await page
    .getByRole("combobox", { name: "Your collection", exact: true })
    .selectOption("44444444-4444-4444-8444-444444444444");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Sunday records",
  );
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "The reading room",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("collection-shell.png"),
    fullPage: true,
  });
  const response = await page.request.get("/api/collections");
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await response.text()).not.toContain("fixture-access-token");
});

test("API failure recovers without leaving the shell", async ({
  page,
  context,
  request,
}) => {
  await signIn(context);
  await request.post("http://127.0.0.1:3102/scenario/error");
  await page.goto("/collections");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "out of reach",
  );
  await request.post("http://127.0.0.1:3102/scenario/ok");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("link", { name: /The reading room/ }),
  ).toBeVisible();
});

test("empty and missing collections have clear recovery states", async ({
  page,
  context,
  request,
}) => {
  await signIn(context);
  await request.post("http://127.0.0.1:3102/scenario/empty");
  await page.goto("/collections");
  await expect(
    page.getByRole("heading", { name: "A little space for what you love." }),
  ).toBeVisible();
  await page.goto("/collections/55555555-5555-4555-8555-555555555555");
  await expect(
    page.getByRole("heading", { name: "Let's find your collection." }),
  ).toBeVisible();
});

test("create a personal collection, recover a failed save, and keep item context when switching", async ({
  page,
  context,
  request,
}, testInfo) => {
  await request.post("http://127.0.0.1:3102/scenario/empty");
  await signIn(context);
  await page.goto("/collections");
  await page
    .getByRole("link", { name: "Create your first collection" })
    .click();
  await page.getByLabel("Collection name").fill("Weekend shelves");
  await page.getByLabel("Hobby or category").fill("Books");
  await page.getByLabel("Description").fill("Stories worth keeping.");
  await page.getByText("Add a cover and colour").click();
  await page.getByLabel("Collection colour").selectOption("clay");
  await page.screenshot({
    path: testInfo.outputPath("collection-create.png"),
    fullPage: true,
  });
  await page.route("**/api/collections", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ status: 503, body: "{}" });
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "Create collection", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "couldn't confirm",
  );
  await expect(page.getByLabel("Collection name")).toHaveValue(
    "Weekend shelves",
  );
  await page.unroute("**/api/collections");
  await page
    .getByRole("button", { name: "Create collection", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Weekend shelves",
  );
  const firstUrl = page.url();
  await expect(
    page.getByText("Stories worth keeping.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Add your first item" }).click();
  await page.getByLabel("Item name").fill("A first edition");
  await page.getByLabel("A few words").fill("Found on a rainy Sunday.");
  await page.getByRole("button", { name: "Save item" }).click();
  await expect(
    page.getByRole("heading", { name: "A first edition" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Overview/ }).click();
  await expect(
    page.getByLabel("Collection summary").locator("dd").first(),
  ).toHaveText("1");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "A first edition" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("collection-overview.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: /New collection/ }).click();
  await page.getByLabel("Collection name").fill("Sunday records");
  await page
    .getByRole("button", { name: "Create collection", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Sunday records",
  );
  await page.getByRole("link", { name: /Overview/ }).click();
  await expect(
    page.getByLabel("Collection summary").locator("dd").first(),
  ).toHaveText("0");
  await expect(page.getByText("A first edition", { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByRole("combobox", { name: "Your collection", exact: true })
    .selectOption(firstUrl.split("/").pop()!);
  await expect(
    page.getByRole("heading", { name: "A first edition" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Overview/ }).click();
  await expect(
    page.getByLabel("Collection summary").locator("dd").first(),
  ).toHaveText("1");
});

test("browse filters, pagination, presentation, history, and collection isolation", async ({
  page,
  context,
  request,
}, testInfo) => {
  await request.post("http://127.0.0.1:3102/scenario/browse");
  await signIn(context);
  const base = "/collections/33333333-3333-4333-8333-333333333333/browse";
  await page.goto(base + "?sortBy=name&sortDirection=asc");
  await expect(page.getByText("14 items", { exact: true })).toBeVisible();
  await expect(page.locator(".browse-items > li")).toHaveCount(12);
  await page.getByRole("link", { name: "Next →" }).click();
  await expect(page.locator(".browse-items > li")).toHaveCount(2);
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.locator(".browse-items")).toHaveClass(/list/);
  await page.getByLabel("Search your collection").fill("book 14");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator(".browse-items > li")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Shelf book 14" }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel("Search your collection")).toHaveValue("");
  await expect(page.locator(".browse-items > li")).toHaveCount(2);
  await page.getByRole("link", { name: "Reset", exact: true }).click();
  await page.getByText("Filters and sorting", { exact: true }).click();
  await page
    .getByRole("combobox", { name: "Location", exact: true })
    .selectOption("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  await page.getByLabel("Favourites", { exact: true }).check();
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("7 items", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByText("Filters and sorting", { exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Location", exact: true }),
  ).toHaveValue("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  await page.screenshot({
    path: testInfo.outputPath("browse.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("combobox", { name: "Your collection", exact: true })
    .selectOption("44444444-4444-4444-8444-444444444444");
  await expect(page).toHaveURL(/444444444444[/]browse$/);
  await expect(
    page.getByRole("heading", { name: "No items in this view." }),
  ).toBeVisible();
  await expect(page.locator(".browse-items")).toHaveCount(0);
});

test("create and edit required fields, recover a draft, manage media, and delete an item", async ({
  page,
  context,
}, testInfo) => {
  await signIn(context);
  await page.goto(
    "/collections/33333333-3333-4333-8333-333333333333/items/new",
  );
  await page.getByLabel("Item name").fill("The garden journal");
  await page
    .getByRole("combobox", { name: "Item type", exact: true })
    .selectOption("cccccccc-cccc-4ccc-8ccc-cccccccccccc");
  await page.getByRole("button", { name: "Save item" }).click();
  await expect(page.getByLabel("Edition (required)")).toBeFocused();
  await page.getByLabel("Edition (required)").fill("First printing");
  await page
    .getByRole("combobox", { name: "Location", exact: true })
    .selectOption("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  await page.getByLabel("Favourites", { exact: true }).check();
  await page.route("**/api/collections/*/items", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 503, body: "{}" })
      : route.continue(),
  );
  await page.getByRole("button", { name: "Save item" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "couldn't confirm",
  );
  await expect(page.getByLabel("Edition (required)")).toHaveValue(
    "First printing",
  );
  await page.unroute("**/api/collections/*/items");
  await page.getByRole("button", { name: "Save item" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "The garden journal",
  );
  const detailUrl = page.url();
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=",
    "base64",
  );
  for (const name of ["front.png", "back.png"]) {
    await page
      .getByLabel("Choose an image")
      .setInputFiles({ name, mimeType: "image/png", buffer: png });
    await page.getByRole("button", { name: "Upload image" }).click();
    await expect(page.getByRole("status")).toHaveText("Image added.");
    await expect(page.getByLabel("Choose an image")).toBeFocused();
  }
  const privateImage = page.locator(".media-grid img").first();
  await privateImage.scrollIntoViewIfNeeded();
  await expect(privateImage).toHaveJSProperty("naturalWidth", 1);
  const contentPath = (await privateImage.getAttribute("src"))!;
  expect(contentPath).toMatch(/^\/api\/collections\/.*\/content$/);
  const mediaResponse = await context.request.get(contentPath);
  expect(mediaResponse.status()).toBe(200);
  expect(mediaResponse.headers()["cache-control"]).toContain("no-store");
  expect(mediaResponse.headers()["x-content-type-options"]).toBe("nosniff");
  const anonymous = await page.request.get(contentPath, {
    headers: { Cookie: "" },
  });
  expect(anonymous.status()).toBe(401);
  await page.getByRole("button", { name: "Make primary" }).click();
  await expect(
    page.locator(".media-grid li").filter({ hasText: "back.png" }),
  ).toContainText("Primary image");
  await page.getByRole("link", { name: "Edit item" }).click();
  await expect(page.getByLabel("Edition (required)")).toHaveValue(
    "First printing",
  );
  await page.getByLabel("Quantity", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Save item" }).click();
  await expect(page.locator(".media-grid li")).toHaveCount(2);
  await expect(page.locator(".item-facts")).toContainText("3");
  await page.screenshot({
    path: testInfo.outputPath("item-detail.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Remove front.png", exact: true })
    .click();
  await page.getByRole("button", { name: "Remove permanently" }).click();
  await expect(page.locator(".media-grid li")).toHaveCount(1);
  expect((await context.request.get(contentPath)).status()).toBe(404);
  await page.goto(
    detailUrl.replace(
      "33333333-3333-4333-8333-333333333333",
      "44444444-4444-4444-8444-444444444444",
    ),
  );
  await expect(
    page.getByRole("heading", { name: "This item is no longer here." }),
  ).toBeVisible();
  await page.goto(detailUrl);
  await page.getByRole("button", { name: "Delete item", exact: true }).click();
  await page.getByRole("button", { name: "Keep item" }).click();
  await expect(
    page.getByRole("button", { name: "Delete item", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Delete item", exact: true }).click();
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await expect(
    page.getByRole("heading", { name: "No items in this view." }),
  ).toBeVisible();
});
test("insights drill through exact counts, preserve and save filters, and switch context", async ({
  page,
  context,
  request,
}, testInfo) => {
  await request.post("http://127.0.0.1:3102/scenario/insights");
  await signIn(context);
  const base = "/collections/33333333-3333-4333-8333-333333333333";
  await page.goto(base + "/insights");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "The reading room",
  );
  await expect(
    page.locator(".insight-cards").getByRole("link", { name: /Items kept/ }),
  ).toContainText("14");
  await page.getByRole("link", { name: "Older activity →" }).click();
  await expect(page.locator(".activity-list > li")).toHaveCount(6);
  await page
    .getByRole("combobox", { name: "Explore a custom field" })
    .selectOption("dddddddd-dddd-4ddd-8ddd-dddddddddddd");
  await expect(
    page.getByRole("link", { name: "First 7", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("insights.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "First 7", exact: true }).click();
  await expect(page.getByText("7 items", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Filters from your view")).toContainText(
    "Edition equals First",
  );
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/exactAttributeValue=First/);
  await expect(page.getByText("7 items", { exact: true })).toBeVisible();
  await page.getByLabel("View name").fill("First editions");
  await page.route("**/saved-views", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 503, body: "{}" })
      : route.continue(),
  );
  await page.getByRole("button", { name: "Save current view" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "couldn't confirm",
  );
  await expect(page.getByLabel("View name")).toHaveValue("First editions");
  await page.unroute("**/saved-views");
  await page.getByRole("button", { name: "Save current view" }).click();
  await expect(
    page.getByRole("link", { name: "First editions ↗" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Reset", exact: true }).click();
  await expect(page.getByText("14 items", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "First editions ↗" }).click();
  await expect(page.getByText("7 items", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Insights", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "First editions ↗" }),
  ).toBeVisible();
  await page
    .locator(".insight-cards")
    .getByRole("link", { name: /Added this month/ })
    .click();
  await expect(page.getByText("14 items", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Filters from your view")).toContainText(
    "Added before",
  );
  await page.getByRole("link", { name: "Insights", exact: true }).click();
  // The switcher persists across client navigation and preserves the committed
  // section. Wait for Insights to commit before using it to change collections.
  await expect(page).toHaveURL(base + "/insights");
  await expect(
    page.getByRole("link", { name: "Insights", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page
    .getByRole("combobox", { name: "Your collection", exact: true })
    .selectOption("44444444-4444-4444-8444-444444444444");
  await expect(page).toHaveURL(/444444444444[/]insights$/);
  await expect(
    page.getByRole("heading", {
      name: "Every collection starts with one find.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "First editions ↗" }),
  ).toHaveCount(0);
  await page.goto(base + "/browse");
  await page
    .getByRole("button", { name: "Remove view First editions" })
    .click();
  await page
    .getByRole("button", { name: "Remove saved view", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "First editions ↗" }),
  ).toHaveCount(0);
});

test("insight failures recover while the collection shell remains available", async ({
  page,
  context,
}) => {
  await signIn(context);
  await page.route("**/api/collections/*/insights", (route) =>
    route.fulfill({ status: 503, body: "{}" }),
  );
  await page.goto("/collections/33333333-3333-4333-8333-333333333333/insights");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "couldn't open",
  );
  await page.unroute("**/api/collections/*/insights");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Every collection starts with one find.",
    }),
  ).toBeVisible();
});

test("collection settings preserve drafts, save identity, and isolate collection context", async ({
  page,
  context,
}, testInfo) => {
  await signIn(context);
  const id = "33333333-3333-4333-8333-333333333333";
  const other = "44444444-4444-4444-8444-444444444444";
  await page.goto(`/collections/${id}`);
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("link", { name: "Settings" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  const name = page.getByRole("textbox", { name: "Collection name" });
  await expect(name).toHaveValue("The reading room");
  await name.fill("  My reading nook  ");
  await page.getByRole("textbox", { name: "Hobby or category" }).fill("Books");
  await page
    .getByRole("textbox", { name: "Description" })
    .fill("Stories gathered over the years.");
  await page.getByLabel("Collection colour").selectOption("clay");
  const cover = page.getByRole("textbox", { name: "Cover image URL" });
  await cover.fill("http://example.org/cover.jpg");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.locator(".collection-settings").getByRole("alert"),
  ).toContainText("HTTPS");
  await expect(cover).toBeFocused();
  await cover.fill("");
  await page.route(`**/api/collections/${id}`, (route) =>
    route.fulfill({ status: 502, json: {} }),
  );
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.locator(".collection-settings").getByRole("alert"),
  ).toContainText("changes are still here");
  await expect(name).toHaveValue("  My reading nook  ");
  await page.unroute(`**/api/collections/${id}`);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".settings-layout").getByRole("status")).toHaveText(
    "Collection settings saved.",
  );
  await expect(name).toHaveValue("My reading nook");
  await expect(page.locator("#collection-switcher option:checked")).toHaveText(
    "My reading nook",
  );
  const previewBounds = await page
    .getByRole("complementary", { name: "Collection preview" })
    .boundingBox();
  const coverBounds = await page
    .locator(".settings-preview .collection-cover")
    .boundingBox();
  expect(coverBounds!.x + coverBounds!.width).toBeLessThanOrEqual(
    previewBounds!.x + previewBounds!.width,
  );
  await page.screenshot({
    path: testInfo.outputPath("settings.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await name.fill("Unsaved replacement");
  await page.getByRole("button", { name: "Discard changes" }).click();
  await expect(name).toHaveValue("My reading nook");
  await page.reload();
  await expect(name).toHaveValue("My reading nook");
  await page.getByRole("link", { name: "Back to overview" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "My reading nook",
  );
  await expect(page.locator('[data-color="clay"]')).toBeVisible();
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await page.getByLabel("Your collection", { exact: true }).selectOption(other);
  await expect(page).toHaveURL(new RegExp(`/collections/${other}/settings$`));
  await expect(name).toHaveValue("Sunday records");
  await expect(page.getByRole("textbox", { name: "Description" })).toHaveValue(
    "",
  );
  await page.getByLabel("Your collection", { exact: true }).selectOption(id);
  await expect(name).toHaveValue("My reading nook");
  await page.getByRole("textbox", { name: "Hobby or category" }).fill("");
  await page.getByRole("textbox", { name: "Description" }).fill("");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".settings-layout").getByRole("status")).toHaveText(
    "Collection settings saved.",
  );
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Description" })).toHaveValue(
    "",
  );
});

test("collection settings PUT requires session, origin, and valid identity", async ({
  context,
  request,
}) => {
  const path = "/api/collections/33333333-3333-4333-8333-333333333333";
  const input = { name: "Changed name", color: "forest" };
  expect(
    (
      await request.put(path, {
        data: input,
        headers: { Origin: "http://127.0.0.1:3101" },
      })
    ).status(),
  ).toBe(401);
  await signIn(context);
  expect(
    (
      await context.request.put(path, {
        data: input,
        headers: { Origin: "https://other.invalid" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await context.request.put(path, {
        data: { ...input, color: "invalid" },
        headers: { Origin: "http://127.0.0.1:3101" },
      })
    ).status(),
  ).toBe(400);
  expect((await context.request.get("/api/collections")).status()).toBe(200);
});

test("pinned items and overview sections persist, reorder, recover, and respect collection context", async ({
  page,
  context,
  request,
}, testInfo) => {
  await request.post("http://127.0.0.1:3102/scenario/browse");
  await signIn(context);
  const id = "33333333-3333-4333-8333-333333333333";
  const other = "44444444-4444-4444-8444-444444444444";
  await page.goto(`/collections/${id}/settings#overview`);
  const editor = page.locator("#overview");
  await editor
    .getByRole("button", { name: "Find items to pin", exact: true })
    .click();
  await editor
    .getByRole("button", { name: "Pin Shelf book 01", exact: true })
    .click();
  await editor
    .getByRole("button", { name: "Pin Shelf book 02", exact: true })
    .click();
  await editor
    .getByRole("button", { name: "Move Shelf book 02 earlier" })
    .click();
  await expect(editor.locator(".pin-list li").first()).toContainText(
    "Shelf book 02",
  );
  await editor.getByRole("button", { name: "Next items" }).click();
  await editor
    .getByRole("button", { name: "Pin Shelf book 07", exact: true })
    .click();
  await editor.getByLabel("Search your items").fill("14");
  await editor
    .getByRole("button", { name: "Search items", exact: true })
    .click();
  await editor
    .getByRole("button", { name: "Pin Shelf book 14", exact: true })
    .click();
  await editor.getByLabel("Search your items").fill("");
  await editor
    .getByRole("button", { name: "Search items", exact: true })
    .click();
  await editor
    .getByRole("button", { name: "Pin Shelf book 03", exact: true })
    .click();
  await editor
    .getByRole("button", { name: "Pin Shelf book 04", exact: true })
    .click();
  await expect(
    editor.getByRole("button", { name: "Pin Shelf book 05", exact: true }),
  ).toBeDisabled();
  await editor.getByRole("button", { name: "Unpin Shelf book 03" }).click();
  await editor.getByRole("button", { name: "Unpin Shelf book 04" }).click();
  await editor.getByLabel("Cover and story").uncheck();
  await editor.getByLabel("Summary counts").uncheck();
  await editor.getByLabel("Recently added", { exact: true }).uncheck();
  await page.route(`**/api/collections/${id}/presentation`, (route) => {
    if (route.request().method() === "PUT")
      return route.fulfill({ status: 502, json: {} });
    return route.continue();
  });
  await editor
    .getByRole("button", { name: "Save overview", exact: true })
    .click();
  await expect(editor.getByRole("alert")).toContainText(
    "choices are still here",
  );
  await expect(editor.locator(".pin-list li")).toHaveCount(4);
  await page.unroute(`**/api/collections/${id}/presentation`);
  await editor
    .getByRole("button", { name: "Save overview", exact: true })
    .click();
  await expect(editor.getByRole("status")).toHaveText("Overview saved.");
  await page.reload();
  await expect(editor.getByLabel("Cover and story")).not.toBeChecked();
  await expect(editor.locator(".pin-list li").first()).toContainText(
    "Shelf book 02",
  );
  await page.screenshot({
    path: testInfo.outputPath("overview-settings.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Pinned items", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recently added", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Collection summary")).toHaveCount(0);
  await expect(page.locator(".identity-hero")).toHaveCount(0);
  const pins = page.getByRole("region", { name: "Pinned items", exact: true });
  await expect(pins.getByRole("heading", { level: 3 })).toHaveText([
    "Shelf book 02",
    "Shelf book 01",
    "Shelf book 07",
    "Shelf book 14",
  ]);
  await page.screenshot({
    path: testInfo.outputPath("pinned-overview.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await pins.getByRole("link", { name: "Shelf book 02", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Shelf book 02",
  );
  const itemId = page.url().split("/").pop();
  expect(
    (
      await context.request.delete(`/api/collections/${id}/items/${itemId}`, {
        headers: { Origin: "http://127.0.0.1:3101" },
      })
    ).status(),
  ).toBe(204);
  await page.goto(`/collections/${id}`);
  await expect(pins.getByRole("heading", { level: 3 })).toHaveText([
    "Shelf book 01",
    "Shelf book 07",
    "Shelf book 14",
  ]);
  await page.getByRole("link", { name: "Customize overview" }).click();
  await editor.getByLabel("Pinned items", { exact: true }).uncheck();
  await editor
    .getByRole("button", { name: "Save overview", exact: true })
    .click();
  await expect(editor.getByRole("status")).toHaveText("Overview saved.");
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Pinned items", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Browse all items" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await editor.getByLabel("Pinned items", { exact: true }).check();
  await editor
    .getByRole("button", { name: "Discard overview changes" })
    .click();
  await expect(
    editor.getByLabel("Pinned items", { exact: true }),
  ).not.toBeChecked();
  await page.getByLabel("Your collection", { exact: true }).selectOption(other);
  await expect(editor.getByLabel("Cover and story")).toBeChecked();
  await expect(editor.locator(".pin-list li")).toHaveCount(0);
  await page.getByLabel("Your collection", { exact: true }).selectOption(id);
  await expect(editor.locator(".pin-list li")).toHaveCount(3);
});

test("presentation updates require a session, same origin, and at most six distinct pins", async ({
  context,
  request,
}) => {
  const path =
    "/api/collections/33333333-3333-4333-8333-333333333333/presentation";
  const data = {
    showCover: true,
    showSummary: true,
    showPinnedItems: true,
    showRecentItems: true,
    pinnedItemIds: [],
  };
  const headers = { Origin: "http://127.0.0.1:3101" };
  expect((await request.put(path, { data, headers })).status()).toBe(401);
  await signIn(context);
  expect(
    (
      await context.request.put(path, {
        data,
        headers: { Origin: "https://other.invalid" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await context.request.put(path, {
        data: {
          ...data,
          pinnedItemIds: [
            "33333333-3333-4333-8333-333333333333",
            "33333333-3333-4333-8333-333333333333",
          ],
        },
        headers,
      })
    ).status(),
  ).toBe(400);
});

test("collection words persist, recover from failed saves, and stay collection scoped", async ({
  page,
  context,
}, testInfo) => {
  await signIn(context);
  const id = "33333333-3333-4333-8333-333333333333";
  const other = "44444444-4444-4444-8444-444444444444";
  await page.goto(`/collections/${id}/settings`);
  const words = page.getByRole("region", { name: "What do you collect?" });
  await words.getByLabel("One", { exact: true }).fill("book");
  await words.getByLabel("More than one").fill("books");
  await page.route(`**/api/collections/${id}/vocabulary`, (route) =>
    route.fulfill({ status: 502, json: {} }),
  );
  await words.getByRole("button", { name: "Save collection words" }).click();
  await expect(words.getByRole("alert")).toContainText(
    "entries are still here",
  );
  await expect(words.getByLabel("One", { exact: true })).toHaveValue("book");
  await page.unroute(`**/api/collections/${id}/vocabulary`);
  await words.getByRole("button", { name: "Save collection words" }).click();
  await expect(words.getByRole("status")).toHaveText("Collection words saved.");
  await page.reload();
  await expect(words.getByLabel("More than one")).toHaveValue("books");
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Add book", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Browse all books" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Add book", exact: true }).click();
  await page.getByLabel("Book name").fill("A vocabulary example");
  await page.getByRole("button", { name: "Save book", exact: true }).click();
  await expect(page.getByRole("link", { name: "Edit book" })).toBeVisible();
  await page.getByRole("link", { name: "Browse", exact: true }).click();
  await expect(
    page.locator(".browse-result-heading").getByRole("status"),
  ).toHaveText("1 book");
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await page.getByLabel("Your collection", { exact: true }).selectOption(other);
  await expect(words.getByLabel("One", { exact: true })).toHaveValue("item");
  await page.getByLabel("Your collection", { exact: true }).selectOption(id);
  await expect(words.getByLabel("One", { exact: true })).toHaveValue("book");
  await words.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("collection-words.png") });
  await words.getByRole("button", { name: "Use item / items" }).click();
  await words.getByRole("button", { name: "Discard word changes" }).click();
  await expect(words.getByLabel("One", { exact: true })).toHaveValue("book");
  await words.getByRole("button", { name: "Use item / items" }).click();
  await words.getByRole("button", { name: "Save collection words" }).click();
  await expect(words.getByRole("status")).toHaveText("Collection words saved.");
  await page.reload();
  await expect(words.getByLabel("One", { exact: true })).toHaveValue("item");
});

test("custom fields support create, required values, rename, scope, and confirmed removal", async ({
  page,
  context,
}, testInfo) => {
  await signIn(context);
  const id = "33333333-3333-4333-8333-333333333333";
  const other = "44444444-4444-4444-8444-444444444444";
  await page.goto(`/collections/${id}/settings#custom-fields`);
  const fields = page.getByRole("region", {
    name: "Choose your custom fields.",
  });
  await fields.getByRole("button", { name: "Add a custom field" }).click();
  const form = fields.getByRole("form", { name: "New custom field" });
  await form.getByLabel("Field name").fill("Maker");
  await form.getByLabel("Required when saving").check();
  await page.route(`**/api/collections/${id}/fields`, (route) =>
    route.fulfill({ status: 502, json: {} }),
  );
  await form.getByRole("button", { name: "Save custom field" }).click();
  await expect(form.getByRole("alert")).toContainText("entries are still here");
  await expect(form.getByLabel("Field name")).toHaveValue("Maker");
  await page.unroute(`**/api/collections/${id}/fields`);
  await form.getByRole("button", { name: "Save custom field" }).click();
  await expect(fields.getByRole("status")).toHaveText("Custom field saved.");
  await page.reload();
  await expect(
    fields.getByRole("heading", { name: "Maker", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await page.getByRole("link", { name: "Add an item", exact: true }).click();
  await page.getByLabel("Item name").fill("Handmade notebook");
  await page.getByRole("button", { name: "Save item" }).click();
  await expect(page).toHaveURL(/\/items\/new$/);
  await expect(page.getByLabel("Maker (required)")).toHaveAttribute(
    "required",
    "",
  );
  await page.getByLabel("Maker (required)").fill("Local bindery");
  await page.getByRole("button", { name: "Save item" }).click();
  await expect(
    page.getByRole("heading", { name: "Handmade notebook" }),
  ).toBeVisible();
  const itemUrl = page.url();
  await expect(page.locator(".item-facts")).toContainText("Local bindery");
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await fields.getByRole("button", { name: "Edit Maker field" }).click();
  const edit = fields.getByRole("form", { name: "Edit Maker field" });
  await expect(edit.getByLabel("Kind of detail")).toBeDisabled();
  await edit.getByLabel("Field name").fill("Edition");
  await edit.getByRole("button", { name: "Save custom field" }).click();
  await expect(edit.getByRole("alert")).toContainText("already use this name");
  await edit.getByLabel("Field name").fill("Craftsperson");
  await edit.getByLabel("Applies to").selectOption({ label: "Book" });
  await edit.getByLabel("Required when saving").uncheck();
  await edit.getByLabel("Available in filters and insights").uncheck();
  await edit.screenshot({
    path: testInfo.outputPath("custom-field-editor.png"),
  });
  await edit.getByRole("button", { name: "Save custom field" }).click();
  await expect(fields.getByRole("status")).toHaveText("Custom field saved.");
  await fields.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("custom-fields.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto(itemUrl);
  await expect(page.locator(".item-facts")).toContainText("Craftsperson");
  await expect(page.locator(".item-facts")).toContainText("Local bindery");
  await page.getByRole("link", { name: "Edit item" }).click();
  await expect(page.getByLabel("Craftsperson (optional)")).toHaveCount(0);
  await page.getByLabel("Item type").selectOption({ label: "Book" });
  await expect(page.getByLabel("Craftsperson (optional)")).toHaveValue(
    "Local bindery",
  );
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await page.getByLabel("Your collection", { exact: true }).selectOption(other);
  await expect(fields).toContainText("No custom fields yet");
  await page.getByLabel("Your collection", { exact: true }).selectOption(id);
  await fields
    .getByRole("button", { name: "Remove Craftsperson field" })
    .click();
  await expect(fields.getByRole("form")).toContainText(
    "permanently deletes its saved values",
  );
  await fields.getByRole("button", { name: "Keep field" }).click();
  await expect(
    fields.getByRole("button", { name: "Add a custom field" }),
  ).toBeFocused();
  await expect(
    fields.getByRole("heading", { name: "Craftsperson" }),
  ).toBeVisible();
  await fields
    .getByRole("button", { name: "Remove Craftsperson field" })
    .click();
  await fields.getByRole("button", { name: "Remove field and values" }).click();
  await expect(fields.getByRole("status")).toHaveText("Custom field removed.");
  await page.goto(itemUrl);
  await expect(
    page.getByRole("heading", { name: "Handmade notebook" }),
  ).toBeVisible();
  await expect(page.locator(".item-facts")).not.toContainText("Local bindery");
});

test("customization writes enforce session, origin, input, and scoped paths", async ({
  context,
  request,
}) => {
  const base = "/api/collections/33333333-3333-4333-8333-333333333333";
  const headers = { Origin: "http://127.0.0.1:3101" };
  const labels = { itemLabel: "book", itemsLabel: "books" };
  const field = {
    name: "Maker",
    dataType: "Text",
    isRequired: false,
    isFilterable: true,
    itemTypeId: null,
  };
  expect(
    (
      await request.put(`${base}/vocabulary`, { data: labels, headers })
    ).status(),
  ).toBe(401);
  expect(
    (await request.post(`${base}/fields`, { data: field, headers })).status(),
  ).toBe(401);
  await signIn(context);
  for (const method of ["post", "put", "delete"] as const) {
    const path = `${base}/fields${method === "post" ? "" : "/dddddddd-dddd-4ddd-8ddd-dddddddddddd"}`;
    expect(
      (
        await context.request[method](path, {
          data: field,
          headers: { Origin: "https://other.test" },
        })
      ).status(),
    ).toBe(403);
  }
  expect(
    (
      await context.request.put(`${base}/vocabulary`, {
        data: labels,
        headers: { Origin: "https://other.test" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await context.request.put(`${base}/vocabulary`, {
        data: { ...labels, itemLabel: "" },
        headers,
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await context.request.post(`${base}/fields`, {
        data: { ...field, dataType: "Unknown" },
        headers,
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await context.request.put(`${base}/fields/not-an-id`, {
        data: field,
        headers,
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await context.request.delete(
        `${base}/fields/dddddddd-dddd-4ddd-8ddd-dddddddddddd/extra`,
        { headers },
      )
    ).status(),
  ).toBe(404);
});
