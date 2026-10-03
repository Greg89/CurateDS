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
  await expect(page).toHaveURL(`${base}/settings#overview`);
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
