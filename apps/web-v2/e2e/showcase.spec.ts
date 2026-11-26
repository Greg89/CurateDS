import { test, expect, type Page } from "@playwright/test";
import { signIn } from "./session";

const id = "33333333-3333-4333-8333-333333333333";
const other = "44444444-4444-4444-8444-444444444444";
const base = `/collections/${id}`;
const path = `${base}/showcase`;

async function images(page: Page) {
  // Local illustrations keep visual checks independent of external image servers.
  await page.route("https://images.test/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900"><rect width="1200" height="900" fill="#ddd9cb"/><ellipse cx="600" cy="760" rx="290" ry="36" fill="#c2bcab"/><g transform="translate(365 105) rotate(-7 230 325)"><rect width="470" height="650" rx="10" fill="#33564b"/><rect x="20" width="7" height="650" fill="#b5a17b"/><rect x="57" y="65" width="355" height="515" rx="170" fill="none" stroke="#d5c9a5" stroke-width="2"/><circle cx="233" cy="273" r="90" fill="#c4b385"/><path d="M175 292L218 222L269 294L292 257L325 324H141Z" fill="#33564b"/><path d="M135 425H335M167 450H303" stroke="#d5c9a5" stroke-width="8"/></g></svg>`,
    }),
  );
}

test.beforeEach(async ({ request, page }) => {
  await request.post("http://127.0.0.1:3102/scenario/showcase");
  await images(page);
});

test("private showcase presents saved identity and ordered highlights without duplicate recent items", async ({
  context,
  page,
}, testInfo) => {
  await signIn(context);
  await page.goto(base);
  await page.getByRole("link", { name: "Showcase", exact: true }).click();
  await expect(page).toHaveURL(path);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "The quiet library",
  );
  await expect(
    page.getByRole("note", { name: "Private preview" }),
  ).toContainText("Only you");
  await expect(page).toHaveTitle("Private showcase preview · CurateDS");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  await expect(
    page.getByRole("navigation", { name: "Collection", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('.showcase[data-color="clay"]')).toBeVisible();
  const highlights = page.getByRole("region", { name: "Selected with care." });
  await expect(highlights.getByRole("heading", { level: 3 })).toHaveText([
    "An atlas of small places",
    "Notes from the garden",
    "A season of quiet",
  ]);
  await expect(
    page
      .getByRole("region", { name: "The latest finds." })
      .getByRole("heading", { level: 3 }),
  ).toHaveText([
    "The long way home",
    "Letters from the coast",
    "The art of noticing",
  ]);
  await expect(page.locator(".showcase-gallery li")).toHaveCount(6);
  await expect(page.getByLabel("Collection at a glance")).toContainText(
    "Books6",
  );
  await expect(
    page.locator(".showcase-intro .collection-cover img"),
  ).toBeVisible();
  await expect(
    page.locator(".showcase-intro .collection-cover img"),
  ).toHaveJSProperty("naturalWidth", 1200);
  for (const img of await page.locator(".showcase-gallery img").all()) {
    await img.scrollIntoViewIfNeeded();
    await expect(img).toHaveJSProperty("naturalWidth", 1200);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("showcase-top.png") });
  await page.screenshot({
    path: testInfo.outputPath("showcase.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await highlights
    .getByRole("heading", { name: "An atlas of small places" })
    .click();
  await expect(page).toHaveURL(new RegExp(`${base}/items/[^/]+$`));
  await expect(page.getByRole("link", { name: "Edit book" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "The quiet library",
  );
  await page.getByLabel("Your collection", { exact: true }).selectOption(other);
  await expect(page).toHaveURL(`/collections/${other}/showcase`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Sunday records",
  );
  await expect(
    page.getByRole("heading", { name: "A collection taking shape." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Add your first item" }),
  ).toBeVisible();
  await expect(page.getByText("An atlas of small places")).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "The quiet library",
  );
  await page.getByRole("link", { name: "← Back to collection" }).click();
  await expect(page).toHaveURL(base);
  await expect(
    page.getByRole("link", { name: "Overview", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("showcase follows saved visibility, keeps hidden pins in recent finds, and reflects item deletion", async ({
  context,
  page,
}, testInfo) => {
  await signIn(context);
  await page.goto(path);
  await page.getByRole("link", { name: "Customize presentation" }).click();
  await expect(page).toHaveURL(`${base}/settings#showcase`);
  const editor = page.locator("#overview");
  await editor.getByLabel("Cover and story").uncheck();
  await editor.getByLabel("Summary counts").uncheck();
  await editor.getByLabel("Pinned books", { exact: true }).uncheck();
  await editor
    .getByRole("button", { name: "Save overview", exact: true })
    .click();
  await expect(editor.getByRole("status")).toHaveText("Overview saved.");
  await page.getByRole("link", { name: "Showcase", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "The latest finds." })
      .getByRole("heading", { level: 3 }),
  ).toHaveCount(6);
  await expect(page.locator(".showcase-intro .collection-cover")).toHaveCount(
    0,
  );
  await expect(page.getByLabel("Collection at a glance")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Selected with care." }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".showcase-intro .collection-cover")).toHaveCount(
    0,
  );
  await page.getByRole("link", { name: "Customize presentation" }).click();
  await editor.getByLabel("Recently added", { exact: true }).uncheck();
  await editor
    .getByRole("button", { name: "Save overview", exact: true })
    .click();
  await expect(editor.getByRole("status")).toHaveText("Overview saved.");
  await page.getByRole("link", { name: "Showcase", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A quiet introduction." }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "The quiet library",
  );
  await page.screenshot({
    path: testInfo.outputPath("showcase-introduction.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Choose what appears" }).click();
  await editor.getByLabel("Pinned books", { exact: true }).check();
  await editor
    .getByRole("button", { name: "Save overview", exact: true })
    .click();
  await expect(editor.getByRole("status")).toHaveText("Overview saved.");
  await page.getByRole("link", { name: "Showcase", exact: true }).click();
  await page
    .getByRole("heading", { name: "An atlas of small places", exact: true })
    .click();
  await page.getByRole("button", { name: "Delete book", exact: true }).click();
  await page
    .getByRole("group", { name: "Confirm book deletion" })
    .getByRole("button", { name: "Delete permanently" })
    .click();
  await expect(page).toHaveURL(`${base}/browse`);
  await page.getByRole("link", { name: "Showcase", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Selected with care." })
      .getByRole("heading", { level: 3 }),
  ).toHaveText(["Notes from the garden", "A season of quiet"]);
});

test("showcase handles image and API failures without revealing a foreign presentation", async ({
  context,
  page,
}) => {
  await signIn(context);
  await page.route(`**/api/collections/${id}/presentation`, (route) =>
    route.fulfill({ status: 502, json: {} }),
  );
  await page.goto(path);
  await expect(page.locator(".showcase").getByRole("alert")).toContainText(
    "Your showcase is out of reach",
  );
  await expect(page.getByRole("article")).toHaveCount(0);
  await page.unroute(`**/api/collections/${id}/presentation`);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("region", { name: "Selected with care." }),
  ).toBeVisible();
  await page.route("https://images.test/**", (route) => route.abort());
  await page.reload();
  await expect(
    page.locator(".showcase-intro .collection-cover > span"),
  ).toHaveText("T");
  for (const card of await page
    .getByRole("region", { name: "Selected with care." })
    .locator("li")
    .all()) {
    await card.scrollIntoViewIfNeeded();
  }
  await expect(
    page
      .getByRole("region", { name: "Selected with care." })
      .locator(".item-image > span"),
  ).toHaveText(["A", "N", "A"]);
  await page.route(`**/api/collections/${id}/presentation`, (route) =>
    route.fulfill({
      json: {
        collectionId: other,
        showCover: true,
        showSummary: true,
        showPinnedItems: true,
        showRecentItems: true,
        pinnedItems: [],
      },
    }),
  );
  await page.reload();
  await expect(page.locator(".showcase").getByRole("alert")).toContainText(
    "Your showcase is out of reach",
  );
  await expect(page.getByRole("article")).toHaveCount(0);
  await page.unroute(`**/api/collections/${id}/presentation`);
  await page.route(`**/api/collections/${id}/presentation`, (route) =>
    route.fulfill({ status: 401, json: {} }),
  );
  await page.reload();
  await expect(page.getByRole("link", { name: "Sign in again" })).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(0);
});

test("showcase stays behind sign-in and handles unknown collections without using another collection", async ({
  context,
  request,
  page,
}) => {
  const unauthenticated = await request.get(path, { maxRedirects: 0 });
  expect(unauthenticated.status()).toBe(307);
  expect(unauthenticated.headers().location).toContain("/auth/login");
  expect(await unauthenticated.text()).not.toContain("The quiet library");
  await signIn(context);
  const authenticated = await context.request.get(path);
  expect(authenticated.headers()["cache-control"]).toContain("no-store");
  await page.goto("/collections/55555555-5555-4555-8555-555555555555/showcase");
  await expect(
    page.getByText("Collection not found", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("The quiet library")).toHaveCount(0);
});

test("saved layouts and optional reports survive reload and stay collection scoped", async ({
  context,
  page,
}, testInfo) => {
  await signIn(context);
  let insightsReads = 0;
  page.on("request", (request) => {
    if (request.url().includes("/insights")) insightsReads++;
  });
  await page.goto(path);
  await expect(page.locator(".showcase")).toHaveAttribute(
    "data-layout",
    "gallery",
  );
  await expect(
    page.getByRole("region", { name: "Collection reports", exact: true }),
  ).toHaveCount(0);
  expect(insightsReads).toBe(0);
  await page.getByRole("link", { name: "Customize presentation" }).click();
  const settings = page.getByRole("region", { name: "Showcase settings" });
  await settings.getByRole("radio", { name: /Journal/ }).check();
  await settings
    .getByRole("checkbox", { name: "Additions over twelve months" })
    .check();
  await settings
    .getByRole("checkbox", { name: "Collection by item type" })
    .check();
  await page.route(`**/api/collections/${id}/showcase-settings`, (route) =>
    route.request().method() === "PUT"
      ? route.fulfill({ status: 502, body: "{}" })
      : route.continue(),
  );
  await settings.getByRole("button", { name: "Save showcase" }).click();
  await expect(settings.getByRole("alert")).toContainText(
    "Your choices are still here",
  );
  await expect(settings.getByRole("radio", { name: /Journal/ })).toBeChecked();
  await page.unroute(`**/api/collections/${id}/showcase-settings`);
  await settings.getByRole("button", { name: "Save showcase" }).click();
  await expect(settings.getByRole("status")).toHaveText("Showcase saved.");
  await settings.screenshot({
    path: testInfo.outputPath("showcase-settings.png"),
  });
  await settings
    .getByRole("link", { name: "Open saved showcase preview" })
    .click();
  await expect(page).toHaveURL(path);
  await page.reload();
  await expect(page.locator(".showcase")).toHaveAttribute(
    "data-layout",
    "journal",
  );
  const growth = page.getByRole("region", {
    name: "Additions over twelve months",
  });
  await expect(growth.getByRole("link")).toHaveCount(12);
  const types = page.getByRole("region", { name: "Collection by item type" });
  await expect(types.getByRole("link")).toContainText("Book");
  await growth.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("showcase-reports.png") });
  const highlights = page.getByRole("region", { name: "Selected with care." });
  await highlights.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("showcase-journal.png") });
  await types.getByRole("link").click();
  await expect(page).toHaveURL(/itemTypeId=/);
  await page.goto(path);
  await page.getByLabel("Your collection").selectOption(other);
  await expect(page.locator(".showcase")).toHaveAttribute(
    "data-layout",
    "gallery",
  );
  await expect(
    page.getByRole("region", { name: "Collection reports", exact: true }),
  ).toHaveCount(0);
  await page.goto(`${base}/settings#showcase`);
  await settings.getByRole("radio", { name: /Gallery/ }).check();
  await settings
    .getByRole("checkbox", { name: "Additions over twelve months" })
    .uncheck();
  await settings
    .getByRole("checkbox", { name: "Collection by item type" })
    .uncheck();
  await settings.getByRole("button", { name: "Save showcase" }).click();
  await expect(settings.getByRole("status")).toHaveText("Showcase saved.");
  await settings
    .getByRole("link", { name: "Open saved showcase preview" })
    .click();
  await expect(page.locator(".showcase")).toHaveAttribute(
    "data-layout",
    "gallery",
  );
  await expect(
    page.getByRole("region", { name: "Collection reports", exact: true }),
  ).toHaveCount(0);
});

test("showcase settings fail closed while report failures leave the gallery usable", async ({
  context,
  page,
}) => {
  await signIn(context);
  const settingsPath = `**/api/collections/${id}/showcase-settings`;
  await page.route(settingsPath, (route) =>
    route.fulfill({
      json: {
        collectionId: other,
        layout: "journal",
        showGrowth: true,
        showTypes: true,
      },
    }),
  );
  await page.goto(path);
  await expect(page.locator(".showcase").getByRole("alert")).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(0);
  await page.unroute(settingsPath);
  await page.route(settingsPath, (route) =>
    route.fulfill({
      json: {
        collectionId: id,
        layout: "journal",
        showGrowth: true,
        showTypes: true,
      },
    }),
  );
  const reportPath = `**/api/collections/${id}/insights`;
  await page.route(reportPath, (route) =>
    route.fulfill({ status: 502, body: "{}" }),
  );
  await page.reload();
  const reports = page.getByRole("region", {
    name: "Collection reports",
    exact: true,
  });
  await expect(reports.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Selected with care." }),
  ).toBeVisible();
  await page.unroute(reportPath);
  await reports.getByRole("button", { name: "Try again" }).click();
  await expect(
    reports
      .getByRole("region", { name: "Additions over twelve months" })
      .getByRole("link"),
  ).toHaveCount(12);
  await page.route(reportPath, async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    await route.fulfill({ json: { ...data, collectionId: other } });
  });
  await page.reload();
  await expect(reports.getByRole("alert")).toBeVisible();
  await expect(
    reports.getByRole("region", { name: "Additions over twelve months" }),
  ).toHaveCount(0);
  await page.unroute(reportPath);
  await page.route(reportPath, (route) =>
    route.fulfill({ status: 401, body: "{}" }),
  );
  await page.reload();
  await expect(
    reports.getByRole("link", { name: "Sign in again" }),
  ).toBeVisible();
});

test("showcase settings enforce session, same-origin writes, and complete input", async ({
  context,
  request,
}) => {
  const endpoint = `/api/collections/${id}/showcase-settings`;
  const headers = { Origin: "http://127.0.0.1:3101" };
  const data = { layout: "journal", showGrowth: true, showTypes: false };
  expect((await request.get(endpoint)).status()).toBe(401);
  expect((await request.put(endpoint, { data, headers })).status()).toBe(401);
  await signIn(context);
  expect(
    (
      await context.request.put(endpoint, {
        data,
        headers: { Origin: "https://other.invalid" },
      })
    ).status(),
  ).toBe(403);
  for (const invalid of [
    { ...data, layout: "unknown" },
    { layout: "journal", showGrowth: true },
    { ...data, showTypes: "false" },
  ]) {
    expect(
      (
        await context.request.put(endpoint, { data: invalid, headers })
      ).status(),
    ).toBe(400);
  }
  const response = await context.request.get(endpoint);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await response.json()).toEqual({
    collectionId: id,
    layout: "gallery",
    showGrowth: false,
    showTypes: false,
  });
});
