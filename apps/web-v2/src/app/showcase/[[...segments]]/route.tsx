import { prerender } from "react-dom/static.edge";
import { PublicShowcaseView } from "@/components/public-showcase-view";
import { loadPublicShowcase, publicMedia } from "@/lib/public-showcase-handler";
import { publicHeaders } from "@/lib/publication-handler";
import { showcaseMetadata } from "@/lib/showcase-metadata";
import { renderSocialCard } from "@/lib/social-card";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ segments?: string[] }> };
async function route(request: Request, context: Context) {
  const { segments = [] } = await context.params;
  const [slug, media, revision, asset] = segments;
  const head = request.method === "HEAD";
  const deps = { apiBaseUrl: process.env.API_BASE_URL };
  if (segments.length === 4 && media === "media")
    return publicMedia(slug, revision, asset, head, deps);
  if (segments.length === 3 && media === "social") {
    const edition = await loadPublicShowcase(slug, deps, revision);
    if (edition.status === 200) return renderSocialCard(edition.showcase, head);
    return new Response(
      head
        ? null
        : edition.status === 404
          ? "Showcase unavailable."
          : "Please try again later.",
      {
        status: edition.status,
        headers: {
          ...publicHeaders,
          "Content-Type": "text/plain; charset=utf-8",
        },
      },
    );
  }
  let result =
    segments.length === 1
      ? await loadPublicShowcase(slug, deps)
      : { status: 404 as const };
  let metadata: ReturnType<typeof showcaseMetadata> | undefined;
  if (result.status === 200) {
    try {
      metadata = showcaseMetadata(result.showcase, process.env.APP_BASE_URL);
    } catch {
      result = { status: 503 };
    }
  }
  // One checked DTO supplies the entire document. A route response preserves 404/503
  // before emitting HTML, including for HEAD; no streaming error or Auth0 shell.
  const { prelude } = await prerender(
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>
          {metadata
            ? `${metadata.title} · CurateDS`
            : "Collection showcase · CurateDS"}
        </title>
        <meta name="robots" content="noindex, nofollow" />
        {metadata && (
          <>
            <meta name="description" content={metadata.description} />
            <link rel="canonical" href={metadata.canonical} />
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content="CurateDS" />
            <meta property="og:title" content={metadata.title} />
            <meta property="og:description" content={metadata.description} />
            <meta property="og:url" content={metadata.canonical} />
            <meta property="og:image" content={metadata.image} />
            <meta property="og:image:type" content="image/png" />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:image:alt" content={metadata.imageAlt} />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={metadata.title} />
            <meta name="twitter:description" content={metadata.description} />
            <meta name="twitter:image" content={metadata.image} />
            <meta name="twitter:image:alt" content={metadata.imageAlt} />
          </>
        )}
        <link rel="stylesheet" href="/showcase.css" />
      </head>
      <body className="public-page">
        <a className="public-skip" href="#main">
          Skip to content
        </a>
        <header className="public-brand">CurateDS</header>
        <main id="main">
          {result.status === 200 ? (
            <PublicShowcaseView
              showcase={result.showcase}
              imageUrl={(asset) =>
                `/showcase/${slug}/media/${result.showcase.revisionToken}/${asset}`
              }
            />
          ) : (
            <section className="public-error">
              <h1>
                {result.status === 404
                  ? "This showcase is unavailable."
                  : "A little out of reach."}
              </h1>
              <p>
                {result.status === 404
                  ? "It may no longer be shared, or the address may be incorrect."
                  : "Please try again later."}
              </p>
            </section>
          )}
        </main>
      </body>
    </html>,
  );
  const html = await new Response(prelude).text();
  return new Response(head ? null : html, {
    status: result.status,
    headers: {
      ...publicHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    },
  });
}
export { route as GET, route as HEAD };
