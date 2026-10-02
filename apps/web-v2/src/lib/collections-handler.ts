import "server-only";
import { collectionsSchema } from "./collections";

type Dependencies = {
  getSession: () => Promise<unknown>;
  getToken: () => Promise<string>;
  apiBaseUrl: string | undefined;
  fetcher?: typeof fetch;
};

function reply(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

// This boundary only exposes the collection-list operation. Tokens and upstream diagnostics
// stay on the server; domain ownership continues to be enforced by the .NET API.
export async function handleCollections(dependencies: Dependencies) {
  let token: string;
  try {
    if (!(await dependencies.getSession()))
      return reply({ code: "sign_in_required" }, 401);
    token = await dependencies.getToken();
    if (!token) return reply({ code: "sign_in_required" }, 401);
  } catch {
    return reply({ code: "sign_in_required" }, 401);
  }

  if (!dependencies.apiBaseUrl)
    return reply({ code: "service_unavailable" }, 503);
  try {
    const base = new URL(dependencies.apiBaseUrl);
    if (
      !["http:", "https:"].includes(base.protocol) ||
      base.username ||
      base.password
    ) {
      return reply({ code: "service_unavailable" }, 503);
    }
    const url = new URL(base.toString().replace(/\/$/, "") + "/collections");
    const response = await (dependencies.fetcher ?? fetch)(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 401 || response.status === 403) {
      return reply(
        {
          code: response.status === 401 ? "sign_in_required" : "access_denied",
        },
        response.status,
      );
    }
    if (!response.ok) return reply({ code: "collections_unavailable" }, 502);
    const parsed = collectionsSchema.safeParse(await response.json());
    if (!parsed.success) return reply({ code: "invalid_api_response" }, 502);
    return reply(parsed.data);
  } catch {
    return reply({ code: "collections_unavailable" }, 502);
  }
}
