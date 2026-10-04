import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
const jpeg = await readFile(new URL("./showcase-fixture.jpg", import.meta.url));
let heads = new Map(),
  reviews = new Map(),
  failure = null,
  outage = false;
export function resetPublications() {
  heads = new Map();
  reviews = new Map();
  failure = null;
  outage = false;
}
function head(id) {
  if (!heads.has(id))
    heads.set(id, {
      state: "unpublished",
      slug: null,
      generation: 0,
      revisionToken: null,
      publishedUtc: null,
      suspensionReason: null,
      edition: null,
    });
  return heads.get(id);
}
function status(value) {
  const { edition, ...rest } = value;
  return rest;
}
async function body(request) {
  let text = "";
  for await (const chunk of request) text += chunk;
  return JSON.parse(text || "{}");
}
export async function publicationFixture(
  request,
  response,
  { collections, items, presentations, showcaseSettings },
) {
  const parts = new URL(request.url, "http://fixture.test").pathname
    .split("/")
    .filter(Boolean);
  const send = (value, code = 200) => {
    response.statusCode = code;
    response.setHeader("Cache-Control", "no-store");
    response.end(request.method === "HEAD" ? undefined : JSON.stringify(value));
    return true;
  };
  const image = () => {
    response.setHeader("Content-Type", "image/jpeg");
    response.setHeader("Cache-Control", "no-store");
    response.end(request.method === "HEAD" ? undefined : jpeg);
    return true;
  };
  if (parts[0] === "publication-fixture") {
    const input = await body(request);
    failure = input.failNext ?? null;
    outage = input.outage ?? false;
    if (input.suspend) {
      const h = head(input.suspend);
      h.state = "suspended";
      h.generation++;
      h.revisionToken = null;
      h.edition = null;
      h.suspensionReason = "source_removed";
    }
    return send({});
  }
  if (parts[0] === "showcases") {
    if (request.headers.cookie || request.headers.authorization)
      return send({ private: "credentials reached public API" }, 500);
    if (outage) return send({ private: "PRIVATE_SENTINEL" }, 503);
    const h = [...heads.values()].find(
      (v) => v.slug === parts[1] && v.state === "published",
    );
    if (!h) return send({}, 404);
    if (parts.length === 2) return send(h.edition);
    if (
      parts.length === 5 &&
      parts[2] === "media" &&
      parts[3] === h.revisionToken &&
      [...(h.edition.highlights || []), ...(h.edition.recent || [])].some(
        (v) => v.imageToken === parts[4],
      )
    )
      return image();
    return send({}, 404);
  }
  if (parts[0] !== "collections" || parts[2] !== "publication") return false;
  const collection = collections.find((v) => v.id === parts[1]);
  if (!collection) return send({}, 404);
  const h = head(collection.id);
  if (failure && request.method !== "GET" && request.method !== "HEAD") {
    const code = failure;
    failure = null;
    return send({ private: "PRIVATE_SENTINEL" }, code);
  }
  if (parts.length === 3) {
    if (request.method === "GET") return send(status(h));
    if (request.method === "DELETE") {
      Object.assign(h, {
        state: "unpublished",
        generation: h.generation + 1,
        revisionToken: null,
        publishedUtc: null,
        suspensionReason: null,
        edition: null,
      });
      return send(status(h));
    }
    if (request.method === "PUT") {
      const input = await body(request),
        p = reviews.get(input.candidateToken);
      if (
        h.state === "published" &&
        h.revisionToken === p?.showcase.revisionToken
      )
        return send(status(h));
      if (
        !p ||
        p.collectionId !== collection.id ||
        p.generation !== h.generation ||
        input.expectedGeneration !== h.generation ||
        Date.parse(p.expiresUtc) < Date.now() ||
        [...heads.values()].some((v) => v !== h && v.slug === p.showcase.slug)
      )
        return send({}, 409);
      const publishedUtc = new Date().toISOString();
      Object.assign(h, {
        state: "published",
        slug: p.showcase.slug,
        generation: h.generation + 1,
        revisionToken: p.showcase.revisionToken,
        publishedUtc,
        suspensionReason: null,
        edition: { ...structuredClone(p.showcase), publishedUtc },
      });
      return send(status(h));
    }
  }
  if (
    parts[3] === "previews" &&
    parts.length === 4 &&
    request.method === "POST"
  ) {
    const input = await body(request);
    if (h.slug && h.slug !== input.slug) return send({}, 409);
    const own = items.filter((v) => v.collectionId === collection.id),
      p = presentations[collection.id] || {
        showCover: true,
        showSummary: true,
        showPinnedItems: true,
        showRecentItems: true,
        pinnedItemIds: [],
      };
    const settings = showcaseSettings[collection.id] || {
      layout: "gallery",
      showGrowth: false,
      showTypes: false,
    };
    const pins = p.showPinnedItems
      ? p.pinnedItemIds
          .map((id) => own.find((v) => v.id === id))
          .filter(Boolean)
          .slice(0, 6)
      : [];
    const card = (item) => ({
      token: randomUUID(),
      name: item.name,
      description: item.description?.slice(0, 1000) || null,
      descriptionTruncated: (item.description?.length || 0) > 1000,
      imageToken:
        !input.omitImages && item.mediaAssets.length ? randomUUID() : null,
    });
    const now = new Date().toISOString();
    const showcase = {
      version: 1,
      slug: input.slug,
      revisionToken: randomUUID(),
      asOfUtc: now,
      publishedUtc: null,
      title: collection.name,
      category: collection.category || null,
      description: collection.description || null,
      layout: settings.layout,
      color: collection.color || "forest",
      itemLabel: collection.itemLabel || "item",
      itemsLabel: collection.itemsLabel || "items",
      showCover: p.showCover,
      ...(p.showSummary
        ? {
            summary: {
              totalItems: own.length,
              totalMedia: own.reduce((sum, v) => sum + v.mediaAssets.length, 0),
              tagsInUse: own.length ? 1 : 0,
            },
          }
        : {}),
      ...(p.showPinnedItems ? { highlights: pins.map(card) } : {}),
      ...(p.showRecentItems
        ? {
            recent: own
              .filter((v) => !pins.includes(v))
              .slice(-6)
              .reverse()
              .map(card),
          }
        : {}),
      ...(settings.showGrowth
        ? {
            growth: Array.from({ length: 12 }, (_, i) => ({
              fromUtc: new Date(Date.UTC(2025, i + 10, 1)).toISOString(),
              untilUtc: new Date(Date.UTC(2025, i + 11, 1)).toISOString(),
              count: i === 11 ? own.length : 0,
            })),
          }
        : {}),
      ...(settings.showTypes
        ? {
            types: {
              groups: [{ name: "Books", count: own.length }],
              totalGroups: 1,
            },
          }
        : {}),
    };
    const review = {
      token: randomUUID(),
      expiresUtc: new Date(Date.now() + 1800000).toISOString(),
      generation: h.generation,
      showcase,
      notices: [
        "External covers use a theme fallback.",
        ...(input.omitImages
          ? ["This edition was prepared without images."]
          : []),
      ],
    };
    reviews.set(review.token, { ...review, collectionId: collection.id });
    return send(review, 201);
  }
  if (parts[3] === "previews") {
    const p = reviews.get(parts[4]);
    if (
      !p ||
      p.collectionId !== collection.id ||
      p.generation !== h.generation ||
      Date.parse(p.expiresUtc) < Date.now()
    )
      return send({}, 404);
    if (parts.length === 5) {
      const { collectionId, ...review } = p;
      return send(review);
    }
    if (
      parts.length === 7 &&
      parts[5] === "media" &&
      [...(p.showcase.highlights || []), ...(p.showcase.recent || [])].some(
        (v) => v.imageToken === parts[6],
      )
    )
      return image();
  }
  return send({}, 404);
}
