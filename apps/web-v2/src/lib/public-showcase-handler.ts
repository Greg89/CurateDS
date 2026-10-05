import "server-only";
import { z } from "zod";
import {
  publicShowcaseSchema,
  publicationSlugSchema,
  type PublicShowcase,
} from "./publication";
import {
  publicationApiUrl,
  publicationImage,
  publicHeaders,
  readPublicationJson,
} from "./publication-handler";
export type PublicDependencies = {
  apiBaseUrl?: string;
  fetcher?: typeof fetch;
};
export type PublicResult =
  { status: 200; showcase: PublicShowcase } | { status: 404 | 503 };
// No incoming request headers, identity provider, session, or owner API is used here.
export async function loadPublicShowcase(
  slug: string,
  deps: PublicDependencies,
  revision?: string,
): Promise<PublicResult> {
  if (
    !publicationSlugSchema.safeParse(slug).success ||
    (revision !== undefined && !z.uuid().safeParse(revision).success)
  )
    return { status: 404 };
  try {
    const response = await (deps.fetcher ?? fetch)(
      publicationApiUrl(
        deps.apiBaseUrl,
        `/showcases/${slug}${revision ? `/revisions/${revision}` : ""}`,
      ),
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      return { status: response.status === 404 ? 404 : 503 };
    }
    const showcase = publicShowcaseSchema.parse(
      await readPublicationJson(response, 65536),
    );
    if (
      showcase.slug !== slug ||
      !showcase.publishedUtc ||
      (revision && showcase.revisionToken !== revision)
    )
      return { status: 503 };
    return { status: 200, showcase };
  } catch {
    return { status: 503 };
  }
}
export async function publicMedia(
  slug: string,
  revision: string,
  asset: string,
  head: boolean,
  deps: PublicDependencies,
) {
  const failure = (status: number) =>
    new Response(
      head
        ? null
        : status === 404
          ? "Showcase unavailable."
          : "Please try again later.",
      {
        status,
        headers: {
          ...publicHeaders,
          "Content-Type": "text/plain; charset=utf-8",
        },
      },
    );
  if (
    !publicationSlugSchema.safeParse(slug).success ||
    !z.uuid().safeParse(revision).success ||
    !z.uuid().safeParse(asset).success
  )
    return failure(404);
  try {
    const response = await (deps.fetcher ?? fetch)(
      publicationApiUrl(
        deps.apiBaseUrl,
        `/showcases/${slug}/media/${revision}/${asset}`,
      ),
      {
        headers: { Accept: "image/jpeg" },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      return failure(response.status === 404 ? 404 : 503);
    }
    return await publicationImage(response, head);
  } catch {
    return failure(503);
  }
}
