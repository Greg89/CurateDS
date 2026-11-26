import { test, expect } from "@playwright/test";
import { signIn } from "./session";
import { checkShowcaseEdge } from "../scripts/check-showcase-edge.mjs";
const id = "33333333-3333-4333-8333-333333333333";
const other = "44444444-4444-4444-8444-444444444444";
const api = `/api/collections/${id}/publication`;
const web = "http://127.0.0.1:3101",
  upstream = "http://127.0.0.1:3102";
const slug = "the-quiet-library",
  visitor = `/showcase/${slug}`;
test.beforeEach(async ({ request, context }) => {
  await request.post(`${upstream}/scenario/showcase`);
  await signIn(context);
});
test("candidate card is authorized, matches the active card, and metadata is present for bots", async ({
  page,
  browser,
  request,
}, info) => {
  await page.route(`**${api}/previews/*/social`, (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto(`/collections/${id}/showcase/review`);
  await page
    .getByRole("button", { name: "Prepare review", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry share card" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("I reviewed this edition and want to make it public."),
  ).toBeDisabled();
  await page.unroute(`**${api}/previews/*/social`);
  await page.getByRole("button", { name: "Retry share card" }).click();
  const image = page.getByRole("img", { name: "Share card preview" });
  await expect(image).toBeVisible();
  await expect(image).toHaveJSProperty("naturalWidth", 1200);
  await expect(image).toHaveJSProperty("naturalHeight", 630);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
  await page.locator(".publication-card").screenshot({
    path: info.outputPath("owner-sharing-card.png"),
  });
  const candidateUrl = (await image.getAttribute("src"))!;
  const preview = await page.request.get(candidateUrl);
  expect(preview.status()).toBe(200);
  expect(preview.headers()["cache-control"]).toContain("private");
  expect(preview.headers()["cache-control"]).toContain("no-store");
  const previewBytes = await preview.body();
  const anonymous = await browser.newContext({ baseURL: web });
  expect((await anonymous.request.get(candidateUrl)).status()).toBe(401);
  expect(
    (await page.request.get(candidateUrl.replace(id, other))).status(),
  ).toBe(404);
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath("owner-sharing-top.png") });
  await page
    .getByLabel("I reviewed this edition and want to make it public.")
    .check();
  await page.getByRole("button", { name: "Publish this edition" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Your reviewed edition is now published.",
  );
  expect((await page.request.get(candidateUrl)).status()).toBe(404);
  const edition = await (
    await request.get(`${upstream}/showcases/${slug}`)
  ).json();
  const social = `${visitor}/social/${edition.revisionToken}`;
  expect(await (await anonymous.request.get(social)).body()).toEqual(
    previewBytes,
  );
  await page.goto(visitor);
  await expect(page).toHaveTitle("The quiet library · CurateDS");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    web + visitor,
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    web + social,
  );
  for (const userAgent of [
    "Mozilla/5.0",
    "Twitterbot/1.0",
    "facebookexternalhit/1.1",
  ]) {
    const response = await anonymous.request.get(visitor, {
      headers: {
        "User-Agent": userAgent,
        "X-Forwarded-Host": "attacker.invalid",
        "X-Forwarded-Proto": "http",
      },
    });
    expect(response.status()).toBe(200);
    const html = await response.text();
    const head = html.split("</head>")[0];
    expect(head).toContain(`content="${web + social}"`);
    expect(head).toContain('property="og:title" content="The quiet library"');
    expect(head).not.toContain("attacker.invalid");
    expect(response.headers()["set-cookie"]).toBeUndefined();
  }
  await signIn(anonymous, { expired: true, refreshToken: "fixture-refresh-0" });
  const signedCard = await anonymous.request.get(social);
  expect(signedCard.status()).toBe(200);
  expect(signedCard.headers()["set-cookie"]).toBeUndefined();
  expect(
    (await (await request.get(`${upstream}/auth-stats`)).json()).refreshCount,
  ).toBe(0);
  const assets = [...edition.highlights, ...edition.recent]
    .map((item) => item.imageToken)
    .filter(Boolean);
  await checkShowcaseEdge(
    {
      webOrigin: web,
      apiOrigin: upstream,
      slug,
      revision: edition.revisionToken,
      assets,
    },
    { log: () => {} },
  );
  await page.request.delete(api, { headers: { origin: web } });
  await checkShowcaseEdge(
    {
      webOrigin: web,
      apiOrigin: upstream,
      slug,
      revision: edition.revisionToken,
      assets,
      phase: "revoked",
    },
    { log: () => {} },
  );
  const gone = await anonymous.request.get(visitor);
  const goneHtml = await gone.text();
  expect(goneHtml).not.toContain("The quiet library");
  expect(goneHtml).not.toContain("og:image");
  await anonymous.close();
});
test("replaced cards, malformed revisions, and outage fail without retaining metadata", async ({
  page,
  request,
}) => {
  await page.goto(`/collections/${id}/showcase/review`);
  const prepare = async () => {
    const response = await page.request.post(`${api}/previews`, {
      headers: { origin: web },
      data: { slug, omitImages: true },
    });
    expect(response.status()).toBe(201);
    return response.json();
  };
  const first = await prepare();
  expect(
    (
      await page.request.put(api, {
        headers: { origin: web },
        data: {
          candidateToken: first.token,
          expectedGeneration: first.generation,
        },
      })
    ).status(),
  ).toBe(200);
  const old = `${visitor}/social/${first.showcase.revisionToken}`;
  expect((await request.get(old)).status()).toBe(200);
  const next = await prepare();
  await page.request.put(api, {
    headers: { origin: web },
    data: { candidateToken: next.token, expectedGeneration: next.generation },
  });
  for (const path of [old, `${visitor}/social/not-a-revision`])
    for (const method of ["get", "head"] as const) {
      const result = await request[method](path);
      expect(result.status()).toBe(404);
      expect(result.headers()["cache-control"]).toBe("no-store");
    }
  await request.post(`${upstream}/publication-fixture`, {
    data: { outage: true },
  });
  for (const path of [
    visitor,
    `${visitor}/social/${next.showcase.revisionToken}`,
  ]) {
    const result = await request.get(path);
    expect(result.status()).toBe(503);
    expect(result.headers()["cache-control"]).toBe("no-store");
    expect(await result.text()).not.toMatch(
      /og:image|The quiet library|PRIVATE_SENTINEL/,
    );
  }
  await request.post(`${upstream}/publication-fixture`, {
    data: { suspend: id },
  });
  expect(
    (
      await request.get(`${visitor}/social/${next.showcase.revisionToken}`)
    ).status(),
  ).toBe(404);
});
