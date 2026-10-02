import { test, expect } from "@playwright/test";
import { generateSessionCookie } from "@auth0/nextjs-auth0/testing";
import { testSecret } from "../playwright.config";

test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:3102/scenario/ok");
});

async function signIn(context: import("@playwright/test").BrowserContext) {
  const value = await generateSessionCookie(
    {
      user: { sub: "auth0|fixture", name: "Alex Collector" },
      tokenSet: {
        accessToken: "fixture-access-token",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
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
