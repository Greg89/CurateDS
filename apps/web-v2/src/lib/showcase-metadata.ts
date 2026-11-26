import type { PublicShowcase } from "./publication";

export function plainText(value: string, limit: number) {
  const text = value
    .replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const characters = Array.from(
    new Intl.Segmenter("en", { granularity: "grapheme" }).segment(text),
    (part) => part.segment,
  );
  return characters.length > limit
    ? characters.slice(0, limit - 1).join("") + "…"
    : text;
}
// A configured origin is the only authority for canonical and image URLs.
export function showcaseOrigin(value: string | undefined) {
  const url = new URL(value ?? "");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && local)) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("Invalid public origin");
  return url.origin;
}
export function showcaseMetadata(
  showcase: PublicShowcase,
  configuredOrigin: string | undefined,
) {
  const origin = showcaseOrigin(configuredOrigin);
  const title = plainText(showcase.title, 100) || "Collection showcase";
  return {
    title,
    description:
      plainText(showcase.description || "", 200) ||
      "A curated collection of things worth keeping, shared with CurateDS.",
    canonical: `${origin}/showcase/${showcase.slug}`,
    image: `${origin}/showcase/${showcase.slug}/social/${showcase.revisionToken}`,
    imageAlt: `${title} · CurateDS`,
  };
}
