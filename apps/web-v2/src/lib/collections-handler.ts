import "server-only";
import { collectionsSchema } from "./collections";
import type { z } from "zod";
import { BodyTooLarge, imageTypes, maxImageBytes, readBody } from "./upload";

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
    headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
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
    upload?: boolean;
    mediaRead?: boolean;
  } = {},
) {
  const method = options.request?.method ?? "GET";
  if (!["GET", "POST", "PUT", "DELETE"].includes(method)) return reply({ code: "method_not_allowed" }, 405);
  const mutation = method !== "GET";
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

  if (mutation && (options.inputSchema || options.upload)) {
    try {
      const bytes = await readBody(options.request!, options.upload ? maxImageBytes + 65536 : 262144);
      if (options.upload) {
        const form = await new Response(bytes, { headers: { "Content-Type": options.request!.headers.get("content-type") ?? "" } }).formData();
        const file = form.get("file");
        if (!(file instanceof File) || form.getAll("file").length !== 1 || !file.size || !imageTypes.includes(file.type))
          return reply({ code: "invalid_image" }, 400);
        if (file.size > maxImageBytes) return reply({ code: "image_too_large" }, 413);
        const upload = new FormData(); upload.set("file", file); body = upload;
      } else {
        const parsed = options.inputSchema!.safeParse(JSON.parse(new TextDecoder().decode(bytes)));
        if (!parsed.success) return reply({ code: "invalid_request" }, 400);
        body = parsed.data;
      }
    } catch (error) {
      if (error instanceof BodyTooLarge) return reply({ code: "request_too_large" }, 413);
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
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(body !== undefined && !options.upload ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: options.upload ? body as FormData : JSON.stringify(body) } : {}),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(options.upload ? 60_000 : 10_000),
    });
    if (response.status === 401 || response.status === 403) {
      return reply(
        {
          code: response.status === 401 ? "sign_in_required" : "access_denied",
        },
        response.status,
      );
    }
    if ([400, 404, 409, 413].includes(response.status))
      return reply(
        { code: response.status === 404 ? "not_found" : "invalid_request" },
        response.status,
      );
    if (!response.ok) return reply({ code: "collections_unavailable" }, 502);
    if (response.status === 204) return new Response(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });
    if (options.mediaRead) {
      const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
      if (response.status !== 200 || !contentType || !imageTypes.includes(contentType)) {
        await response.body?.cancel();
        return reply({ code: "invalid_media_response" }, 502);
      }
      const bytes = await readBody(response, maxImageBytes);
      if (!bytes.length) return reply({ code: "invalid_media_response" }, 502);
      return new Response(bytes, { headers: {
        "Content-Type": contentType, "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
      } });
    }
    const parsed = (options.schema ?? collectionsSchema).safeParse(
      await response.json(),
    );
    if (!parsed.success) return reply({ code: "invalid_api_response" }, 502);
    return reply(parsed.data, method === "POST" ? 201 : 200);
  } catch {
    return reply({ code: "collections_unavailable" }, 502);
  }
}
