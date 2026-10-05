import "server-only";
import { showcaseOrigin } from "./showcase-metadata";

export async function readiness(
  env: Record<string, string | undefined>,
  fetcher: typeof fetch = fetch,
) {
  const headers = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  try {
    showcaseOrigin(env.APP_BASE_URL);
    for (const key of [
      "AUTH0_DOMAIN",
      "AUTH0_CLIENT_ID",
      "AUTH0_CLIENT_SECRET",
      "AUTH0_AUDIENCE",
    ])
      if (!env[key]?.trim())
        throw new Error("Incomplete runtime configuration");
    if (!/^[a-f0-9]{64}$/i.test(env.AUTH0_SECRET ?? ""))
      throw new Error("Invalid cookie secret");
    const api = new URL(env.API_BASE_URL ?? "");
    if (
      !["http:", "https:"].includes(api.protocol) ||
      api.username ||
      api.password ||
      api.pathname !== "/" ||
      api.search ||
      api.hash
    )
      throw new Error("Invalid API origin");
    const response = await fetcher(new URL("/health", api), {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(4000),
    });
    await response.body?.cancel();
    if (!response.ok) throw new Error("API unavailable");
    return Response.json(
      { status: "ok", application: "curateds-web-v2" },
      { headers },
    );
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503, headers });
  }
}
