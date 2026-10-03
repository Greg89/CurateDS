import "server-only";
import { collectionsSchema } from "./collections";
import type { z } from "zod";

export type Dependencies = {
  getSession: () => Promise<unknown>;
  getToken: () => Promise<string>;
  apiBaseUrl: string | undefined;
  fetcher?: typeof fetch;
  appBaseUrl?: string;
};

export function reply(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

// Routes choose explicit paths and schemas; browser input never chooses an upstream URL.
export async function handleCollections(
  dependencies: Dependencies,
  options: {
    path?: string;
    schema?: z.ZodType;
    request?: Request;
    inputSchema?: z.ZodType;
  } = {},
) {
  const mutation = options.request?.method === "POST";
  let body: unknown;
  if (mutation) {
    try {
      const origin = new URL(dependencies.appBaseUrl ?? "").origin;
      if (options.request!.headers.get("origin") !== origin)
        return reply({ code: "access_denied" }, 403);
    } catch {
      return reply({ code: "service_unavailable" }, 503);
    }
  }
  let token: string;
  try {
    if (!(await dependencies.getSession()))
      return reply({ code: "sign_in_required" }, 401);
    token = await dependencies.getToken();
    if (!token) return reply({ code: "sign_in_required" }, 401);
  } catch {
    return reply({ code: "sign_in_required" }, 401);
  }

  if (mutation) {
    try {
      const text = await options.request!.text();
      if (text.length > 16_384) return reply({ code: "invalid_request" }, 400);
      const parsed = options.inputSchema?.safeParse(JSON.parse(text));
      if (!parsed?.success) return reply({ code: "invalid_request" }, 400);
      body = parsed.data;
    } catch {
      return reply({ code: "invalid_request" }, 400);
    }
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
    const url = new URL(
      base.toString().replace(/\/$/, "") + (options.path ?? "/collections"),
    );
    const response = await (dependencies.fetcher ?? fetch)(url, {
      method: mutation ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(mutation ? { "Content-Type": "application/json" } : {}),
      },
      ...(mutation ? { body: JSON.stringify(body) } : {}),
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
    if ([400, 404, 409].includes(response.status))
      return reply(
        { code: response.status === 404 ? "not_found" : "invalid_request" },
        response.status,
      );
    if (!response.ok) return reply({ code: "collections_unavailable" }, 502);
    const parsed = (options.schema ?? collectionsSchema).safeParse(
      await response.json(),
    );
    if (!parsed.success) return reply({ code: "invalid_api_response" }, 502);
    return reply(parsed.data, mutation ? 201 : 200);
  } catch {
    return reply({ code: "collections_unavailable" }, 502);
  }
}
