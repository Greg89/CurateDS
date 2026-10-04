import { prerender } from "react-dom/static.edge";
import { PublicShowcaseView } from "@/components/public-showcase-view";
import { loadPublicShowcase, publicMedia } from "@/lib/public-showcase-handler";
import { publicHeaders } from "@/lib/publication-handler";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ segments?: string[] }> };
async function route(request: Request, context: Context) {
  const { segments = [] } = await context.params;
  const [slug, media, revision, asset] = segments;
  const head = request.method === "HEAD";
  const deps = { apiBaseUrl: process.env.API_BASE_URL };
  if (segments.length === 4 && media === "media")
    return publicMedia(slug, revision, asset, head, deps);
  const result =
    segments.length === 1
      ? await loadPublicShowcase(slug, deps)
      : { status: 404 as const };
  // One checked DTO supplies the entire document. A route response preserves 404/503
  // before emitting HTML, including for HEAD; no streaming error or Auth0 shell.
  const { prelude } = await prerender(
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Collection showcase · CurateDS</title>
        <meta name="robots" content="noindex, nofollow" />
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
