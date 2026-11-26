import "server-only";
import { z } from "zod";
import { type Dependencies, reply } from "./collections-handler";
import {
  activatePublicationSchema,
  preparePublicationSchema,
  publicationPreviewSchema,
  publicationStatusSchema,
} from "./publication";
import { BodyTooLarge, readBody } from "./upload";

export const publicHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
export function publicationApiUrl(base: string | undefined, path: string) {
  const url = new URL(base ?? "");
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error("Invalid API base");
  return new URL(url.toString().replace(/\/$/, "") + path);
}
export async function readPublicationJson(response: Response, limit = 131072) {
  if (
    response.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    throw new Error("Invalid JSON response");
  return JSON.parse(new TextDecoder().decode(await readBody(response, limit)));
}
export async function publicationImage(
  response: Response,
  head: boolean,
  owner = false,
) {
  if (
    response.status !== 200 ||
    response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
      "image/jpeg"
  ) {
    await response.body?.cancel();
    throw new Error("Invalid derivative");
  }
  const bytes = await readBody(response, 1048576);
  if (
    bytes.length < 3 ||
    bytes[0] !== 255 ||
    bytes[1] !== 216 ||
    bytes[2] !== 255
  )
    throw new Error("Invalid derivative");
  return new Response(head ? null : bytes, {
    headers: {
      ...publicHeaders,
      "Cache-Control": owner ? "private, no-store" : "no-store",
      "Content-Type": "image/jpeg",
      "Content-Length": String(bytes.length),
    },
  });
}

// Explicit route selection prevents browser input from choosing an upstream URL.
export async function handlePublication(
  request: Request,
  collectionId: string,
  segments: string[],
  deps: Dependencies,
) {
  const method = request.method;
  if (!z.uuid().safeParse(collectionId).success)
    return reply({ code: "not_found" }, 404);
  const [previews, candidate, media, asset] = segments;
  const root = segments.length === 0;
  const prepare =
    segments.length === 1 && previews === "previews" && method === "POST";
  const review =
    previews === "previews" && z.uuid().safeParse(candidate).success;
  const image =
    review &&
    segments.length === 4 &&
    media === "media" &&
    z.uuid().safeParse(asset).success &&
    ["GET", "HEAD"].includes(method);
  if (
    !(root && ["GET", "PUT", "DELETE"].includes(method)) &&
    !prepare &&
    !(review && segments.length === 2 && method === "GET") &&
    !image
  )
    return reply({ code: "not_found" }, 404);
  if (!["GET", "HEAD"].includes(method)) {
    try {
      if (
        request.headers.get("origin") !== new URL(deps.appBaseUrl ?? "").origin
      )
        return reply({ code: "access_denied" }, 403);
    } catch {
      return reply({ code: "service_unavailable" }, 503);
    }
  }
  let token: string;
  try {
    if (!(await deps.getSession()) || !(token = await deps.getToken()))
      return reply({ code: "sign_in_required" }, 401);
  } catch {
    return reply({ code: "sign_in_required" }, 401);
  }
  let body: unknown;
  if (prepare || method === "PUT") {
    try {
      const input = JSON.parse(
        new TextDecoder().decode(await readBody(request, 4096)),
      );
      body = (
        prepare ? preparePublicationSchema : activatePublicationSchema
      ).parse(input);
    } catch (error) {
      return reply(
        { code: "invalid_request" },
        error instanceof BodyTooLarge ? 413 : 400,
      );
    }
  }
  try {
    const response = await (deps.fetcher ?? fetch)(
      publicationApiUrl(
        deps.apiBaseUrl,
        `/collections/${collectionId}/publication${segments.length ? "/" + segments.join("/") : ""}`,
      ),
      {
        method: image ? "GET" : method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: image ? "image/jpeg" : "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(prepare ? 130000 : 15000),
      },
    );
    if (!response.ok) {
      const errors: Record<number, string> = {
        400: "invalid_request",
        401: "sign_in_required",
        403: "access_denied",
        404: "not_found",
        409: "review_again",
        422: "image_unavailable",
        429: "rate_limited",
        503: "service_unavailable",
      };
      await response.body?.cancel();
      return reply(
        { code: errors[response.status] ?? "service_unavailable" },
        errors[response.status] ? response.status : 503,
      );
    }
    if (image) return await publicationImage(response, method === "HEAD", true);
    const data = await readPublicationJson(response);
    if (prepare || review) {
      const parsed = publicationPreviewSchema.parse(data);
      if (
        (review && parsed.token !== candidate) ||
        (prepare && parsed.showcase.slug !== (body as { slug: string }).slug)
      )
        throw new Error("Review mismatch");
      return reply(parsed, prepare ? 201 : 200);
    }
    return reply(publicationStatusSchema.parse(data));
  } catch {
    return reply({ code: "service_unavailable" }, 503);
  }
}
