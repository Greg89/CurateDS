import { test, expect } from "@playwright/test";
import { generateSessionCookie } from "@auth0/nextjs-auth0/testing";
import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { testSecret } from "../playwright.config";
import { expireAccessToken, readSession } from "../scripts/live-auth-smoke";

test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:3102/scenario/ok");
});

async function signIn(
  context: import("@playwright/test").BrowserContext,
  options: { expired?: boolean; refreshToken?: string } = {},
) {
  const value = await generateSessionCookie(
    {
      user: { sub: "auth0|fixture", name: "Alex Collector" },
      tokenSet: {
        accessToken: "fixture-access-token",
        expiresAt:
          Math.floor(Date.now() / 1000) + (options.expired ? -60 : 3600),
        refreshToken: options.refreshToken,
        audience: "https://curateds.test",
        scope: "openid profile email offline_access",
      },
    },
    { secret: testSecret },
  );
  await context.addCookies([
    {
      name: "__session",
      value,
      url: "http://127.0.0.1:3101",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

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
    .getByLabel("Your collection")
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
  await page.getByRole("button", { name: "Add your first item" }).click();
  await page.getByLabel("Item name").fill("A first edition");
  await page.getByLabel("A few words").fill("Found on a rainy Sunday.");
  await page.getByRole("button", { name: "Save item" }).click();
  await expect(
    page.getByRole("heading", { name: "A first edition" }),
  ).toBeVisible();
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
  await expect(
    page.getByLabel("Collection summary").locator("dd").first(),
  ).toHaveText("0");
  await expect(page.getByText("A first edition", { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByLabel("Your collection")
    .selectOption(firstUrl.split("/").pop()!);
  await expect(
    page.getByRole("heading", { name: "A first edition" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Collection summary").locator("dd").first(),
  ).toHaveText("1");
});
