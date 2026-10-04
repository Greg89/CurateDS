import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import { signIn } from "./session";
const id = "33333333-3333-4333-8333-333333333333";
const other = "44444444-4444-4444-8444-444444444444";
const workspace = `/collections/${id}`;
const review = `${workspace}/showcase/review`;
const api = `/api/collections/${id}/publication`;
const visitor = "/showcase/the-quiet-library";
const origin = "http://127.0.0.1:3101";
const fixture = "http://127.0.0.1:3102";
async function prepare(page: Page) {
  await page.getByRole("button", { name: /^Prepare (a new )?review$/ }).click();
  await expect(
    page.getByRole("region", { name: "Review this edition" }),
  ).toBeVisible();
}
async function publish(page: Page) {
  await page
    .getByLabel("I reviewed this edition and want to make it public.")
    .check();
  await page
    .getByRole("button", { name: /^Publish (this|updated) edition$/ })
    .click();
  await expect(page.getByRole("status")).toHaveText(
    "Your reviewed edition is now published.",
  );
}
async function control(request: APIRequestContext, value: object) {
  await request.post(`${fixture}/publication-fixture`, { data: value });
}
test.beforeEach(async ({ request }) => {
  await request.post(`${fixture}/scenario/showcase`);
});

test("review is private, publication is explicit, and update/unpublish preserves the address", async ({
  context,
  page,
  browser,
  request,
}, info) => {
  await signIn(context);
  await page.goto(`${workspace}/showcase`);
  await page.getByRole("link", { name: "Review for sharing →" }).click();
  await expect(page).toHaveURL(review);
  await expect(page.getByText("unpublished", { exact: true })).toBeVisible();
  expect((await request.get(visitor)).status()).toBe(404);
  await prepare(page);
  await expect(
    page.getByRole("button", { name: "Publish this edition" }),
  ).toBeDisabled();
  expect((await request.get(visitor)).status()).toBe(404);
  const staged = await page
    .locator(".public-image img")
    .first()
    .getAttribute("src");
  const anonymous = await browser.newContext({ baseURL: origin });
  expect((await anonymous.request.get(staged!)).status()).toBe(401);
  await expect(page.locator(".public-showcase h1")).toHaveText(
    "The quiet library",
  );
  await expect(page.locator(".public-showcase a")).toHaveCount(0);
  await page.screenshot({
    path: info.outputPath("review.png"),
    fullPage: true,
  });
  await publish(page);
  const publicPage = await anonymous.newPage();
  const response = await publicPage.goto(origin + visitor);
  expect(response?.status()).toBe(200);
  expect(response?.headers()["cache-control"]).toBe("no-store");
  expect(response?.headers()["set-cookie"]).toBeUndefined();
  await expect(publicPage.getByRole("heading", { level: 1 })).toHaveText(
    "The quiet library",
  );
  await expect(publicPage.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  await expect(
    publicPage.locator('a[href*="/collections"],a[href*="/auth"],script'),
  ).toHaveCount(0);
  for (const image of await publicPage.locator(".public-image img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveJSProperty("naturalWidth", 640);
  }
  await publicPage.evaluate(() => window.scrollTo(0, 0));
  expect(
    await publicPage.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await publicPage.screenshot({
    path: info.outputPath("visitor-gallery.png"),
    fullPage: true,
  });
  const retired = await publicPage
    .locator(".public-image img")
    .first()
    .getAttribute("src");
  const oldHtml = await (await anonymous.request.get(visitor)).text();
  await page.request.put(`/api/collections/${id}`, {
    headers: { origin },
    data: {
      name: "A renamed library",
      category: null,
      description: "A new story",
      color: "slate",
      coverImageUrl: null,
    },
  });
  expect(await (await anonymous.request.get(visitor)).text()).toBe(oldHtml);
  await prepare(page);
  await expect(page.locator(".public-showcase h1")).toHaveText(
    "A renamed library",
  );
  await publish(page);
  expect((await anonymous.request.get(retired!)).status()).toBe(404);
  await publicPage.reload();
  await expect(publicPage.getByRole("heading", { level: 1 })).toHaveText(
    "A renamed library",
  );
  await expect(page.getByLabel("Showcase address")).toHaveValue(
    "the-quiet-library",
  );
  await expect(page.getByLabel("Showcase address")).toHaveAttribute(
    "readonly",
    "",
  );
  await page.getByRole("button", { name: "Unpublish", exact: true }).click();
  await page.getByRole("button", { name: "Confirm unpublish" }).click();
  await expect(page.getByRole("status")).toContainText("Unpublished.");
  for (const method of ["get", "head"] as const) {
    const result = await anonymous.request[method](visitor);
    expect(result.status()).toBe(404);
    expect(result.headers()["cache-control"]).toBe("no-store");
  }
  await expect(page.getByLabel("Showcase address")).toHaveValue(
    "the-quiet-library",
  );
  await prepare(page);
  await publish(page);
  expect((await anonymous.request.get(visitor)).status()).toBe(200);
  await anonymous.close();
});

test("failed activation is retryable, conflicts require a fresh review, and invalid slugs are explained", async ({
  context,
  page,
  request,
}) => {
  await signIn(context);
  await page.goto(review);
  await page.getByLabel("Showcase address").fill("INVALID address");
  await expect(
    page.locator(".publication-review").getByRole("alert"),
  ).toContainText("lowercase");
  await expect(
    page.getByRole("button", { name: "Prepare review", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Showcase address").fill("the-quiet-library");
  await prepare(page);
  await publish(page);
  const before = await (await request.get(visitor)).text();
  await prepare(page);
  await control(request, { failNext: 503 });
  await page
    .getByLabel("I reviewed this edition and want to make it public.")
    .check();
  await page.getByRole("button", { name: "Publish updated edition" }).click();
  await expect(
    page.locator(".publication-review").getByRole("alert"),
  ).toContainText("could not confirm");
  await expect(
    page.getByRole("region", { name: "Review this edition" }),
  ).toBeVisible();
  expect(await (await request.get(visitor)).text()).toBe(before);
  await control(request, { failNext: 409 });
  await page.getByRole("button", { name: "Publish updated edition" }).click();
  await expect(
    page.locator(".publication-review").getByRole("alert"),
  ).toContainText("Prepare a new review");
  await expect(
    page.getByRole("region", { name: "Review this edition" }),
  ).toHaveCount(0);
  expect(await (await request.get(visitor)).text()).toBe(before);
  await prepare(page);
  await publish(page);
});

test("image failure offers a deliberate fallback and Journal reports use the reviewed snapshot", async ({
  context,
  page,
  request,
}, info) => {
  await signIn(context);
  await page.goto(review);
  await expect(
    page.getByRole("button", { name: "Prepare review", exact: true }),
  ).toBeVisible();
  await page.request.put(`/api/collections/${id}/showcase-settings`, {
    headers: { origin },
    data: { layout: "journal", showGrowth: true, showTypes: true },
  });
  await control(request, { failNext: 422 });
  await page
    .getByRole("button", { name: "Prepare review", exact: true })
    .click();
  await expect(
    page.locator(".publication-review").getByRole("alert"),
  ).toContainText("without images");
  await page.getByLabel("Prepare without images").check();
  await prepare(page);
  await expect(page.locator(".public-image img")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Review this edition" }),
  ).toContainText("entire collection");
  await publish(page);
  await page.goto(visitor);
  await expect(
    page.locator('.public-showcase[data-layout="journal"]'),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Twelve-month additions" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Item types", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("visitor-journal.png"),
    fullPage: true,
  });
});

test("public GET and HEAD bypass expired sessions, handle outage, and deny suspended editions and images", async ({
  context,
  page,
  request,
  browser,
}) => {
  await signIn(context);
  await page.goto(review);
  await prepare(page);
  await publish(page);
  const publicResponse = await request.get(visitor);
  expect(publicResponse.status()).toBe(200);
  const html = await publicResponse.text();
  const asset = html.match(/src="([^"]*\/media\/[^"]+)"/)![1];
  const signed = await browser.newContext({ baseURL: origin });
  await signIn(signed, { expired: true, refreshToken: "fixture-refresh-0" });
  for (const path of [visitor, asset, "/showcase/missing", "/showcase.css"]) {
    for (const method of ["get", "head"] as const) {
      const response = await signed.request[method](path);
      expect(response.status()).toBe(path.includes("missing") ? 404 : 200);
      expect(response.headers()["set-cookie"]).toBeUndefined();
      expect(response.headers()["cache-control"]).toContain("no-store");
      if (method === "head") expect(await response.body()).toHaveLength(0);
    }
  }
  expect(await (await signed.request.get(visitor)).text()).toBe(html);
  expect(
    (await (await request.get(`${fixture}/auth-stats`)).json()).refreshCount,
  ).toBe(0);
  await control(request, { outage: true });
  for (const method of ["get", "head"] as const) {
    const response = await signed.request[method](visitor);
    expect(response.status()).toBe(503);
    expect(response.headers()["cache-control"]).toBe("no-store");
    const text = await response.text();
    expect(text).not.toContain("The quiet library");
    expect(text).not.toContain("PRIVATE_SENTINEL");
  }
  expect((await signed.request.get(asset)).status()).toBe(503);
  await control(request, { suspend: id });
  for (const path of [visitor, asset]) {
    expect((await signed.request.get(path)).status()).toBe(404);
    expect((await signed.request.head(path)).status()).toBe(404);
  }
  await page.reload();
  await expect(page.getByText("suspended", { exact: true })).toBeVisible();
  await expect(page.getByText(/A source was removed/)).toBeVisible();
  await prepare(page);
  await publish(page);
  expect((await signed.request.get(visitor)).status()).toBe(200);
  await signed.close();
});

test("hidden sections and empty collections render without private item fields or owner actions", async ({
  context,
  page,
  request,
}) => {
  await signIn(context);
  await page.goto(review);
  await expect(
    page.getByRole("button", { name: "Prepare review", exact: true }),
  ).toBeVisible();
  await page.request.put(`/api/collections/${id}/presentation`, {
    headers: { origin },
    data: {
      showCover: false,
      showSummary: false,
      showPinnedItems: false,
      showRecentItems: false,
      pinnedItemIds: [],
    },
  });
  await prepare(page);
  await expect(page.locator(".public-showcase h1")).toHaveText(
    "The quiet library",
  );
  await expect(
    page.locator(".public-gallery,.public-summary,.public-cover"),
  ).toHaveCount(0);
  await publish(page);
  const html = await (await request.get(visitor)).text();
  for (const sentinel of [
    "An atlas of small places",
    "Study",
    "Favourites",
    id,
    "quantity",
    "collectionId",
    "storageKey",
  ])
    expect(html).not.toContain(sentinel);
  await page.goto(`/collections/${other}/showcase/review`);
  await prepare(page);
  await expect(page.locator(".public-showcase h1")).toHaveText(
    "Sunday records",
  );
  await publish(page);
  await page.goto("/showcase/sunday-records");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Sunday records",
  );
  await expect(page.locator('a[href*="/collections"],button')).toHaveCount(0);
});
