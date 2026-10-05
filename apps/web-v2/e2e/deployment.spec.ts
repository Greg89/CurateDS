import { test, expect } from "@playwright/test";
import { signIn } from "./session";
import { checkDeployment } from "../scripts/check-deployment.mjs";
test("the read-only deployed smoke checker passes", async () => {
  await checkDeployment("http://127.0.0.1:3101", { log: () => {} });
});
test("legacy collection bookmarks redirect to V2 and preserve queries", async ({
  request,
}) => {
  const base = "/collections/33333333-3333-4333-8333-333333333333";
  for (const [oldPath, newPath] of [
    ["overview", ""],
    ["items", "/browse"],
    ["reports", "/insights"],
  ]) {
    const response = await request.get(`${base}/${oldPath}?search=library`, {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(307);
    const location = new URL(
      response.headers().location,
      "http://127.0.0.1:3101",
    );
    expect(location.pathname).toBe(base + newPath);
    expect(location.searchParams.get("search")).toBe("library");
  }
});
test("readiness identifies V2 without refreshing an expired account session", async ({
  context,
  request,
}) => {
  await request.post("http://127.0.0.1:3102/scenario/showcase");
  await signIn(context, { expired: true, refreshToken: "fixture-refresh-0" });
  for (const method of ["get", "head"] as const) {
    const response = await context.request[method]("/health");
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["set-cookie"]).toBeUndefined();
    if (method === "get")
      expect(await response.json()).toEqual({
        status: "ok",
        application: "curateds-web-v2",
      });
    else expect(await response.body()).toHaveLength(0);
  }
  expect(
    (await (await request.get("http://127.0.0.1:3102/auth-stats")).json())
      .refreshCount,
  ).toBe(0);
});
