// @vitest-environment node
import { expect, it, vi } from "vitest";
import { readiness } from "@/lib/readiness";
const env = {
  APP_BASE_URL: "https://beta.example",
  API_BASE_URL: "http://catalog-api:8080",
  AUTH0_DOMAIN: "issuer.example",
  AUTH0_CLIENT_ID: "client",
  AUTH0_CLIENT_SECRET: "private-value",
  AUTH0_SECRET: "ab".repeat(32),
  AUTH0_AUDIENCE: "https://api.example",
};
it("checks the API without credentials or redirects and identifies the V2 deployment", async () => {
  const fetcher = vi.fn<typeof fetch>(async () => new Response("Healthy"));
  const response = await readiness(env, fetcher);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    status: "ok",
    application: "curateds-web-v2",
  });
  expect(fetcher.mock.calls[0][0].toString()).toBe(
    "http://catalog-api:8080/health",
  );
  expect(fetcher.mock.calls[0][1]).toMatchObject({
    cache: "no-store",
    redirect: "error",
  });
  expect(fetcher.mock.calls[0][1]?.headers).toBeUndefined();
  expect(response.headers.get("cache-control")).toBe("no-store");
});
it.each([
  { AUTH0_CLIENT_SECRET: "" },
  { AUTH0_SECRET: "short" },
  { APP_BASE_URL: "https://beta.example/path" },
  { API_BASE_URL: "https://user:password@api.example" },
])(
  "rejects incomplete/unsafe runtime settings without disclosing them",
  async (change) => {
    const fetcher = vi.fn<typeof fetch>();
    const response = await readiness({ ...env, ...change }, fetcher);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable" });
    expect(fetcher).not.toHaveBeenCalled();
  },
);
it("fails readiness on API failure", async () => {
  for (const fetcher of [
    async () => new Response(null, { status: 503 }),
    async () => {
      throw new Error("private connection details");
    },
  ]) {
    const response = await readiness(env, fetcher);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private");
  }
});
