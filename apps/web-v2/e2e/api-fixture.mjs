import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import {
  publicationFixture,
  resetPublications,
} from "./publication-fixture.mjs";
const initialCollections = [
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "The reading room",
    createdUtc: "2026-10-02T00:00:00Z",
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    name: "Sunday records",
    createdUtc: "2026-09-02T00:00:00Z",
  },
];
let collections = structuredClone(initialCollections);
let items = [];
let savedViews = [];
let presentations = {};
let showcaseSettings = {};
const tag = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Favourites",
  key: "favourites",
  createdUtc: "2026-10-02T00:00:00Z",
};
const location = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  name: "Study",
  description: null,
  createdUtc: tag.createdUtc,
};
const type = {
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  collectionId: initialCollections[0].id,
  name: "Book",
  sortOrder: 0,
  createdUtc: tag.createdUtc,
};
const definition = {
  id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  collectionId: initialCollections[0].id,
  name: "Edition",
  key: "edition",
  dataType: "Text",
  isRequired: true,
  isFilterable: true,
  itemTypeId: type.id,
  sortOrder: 0,
  createdUtc: tag.createdUtc,
};
let definitions = [structuredClone(definition)];
function makeItem(input, collectionId) {
  return {
    id: randomUUID(),
    collectionId,
    name: input.name,
    description: input.description ?? null,
    quantity: input.quantity ?? 1,
    locationId: input.locationId ?? null,
    locationName: input.locationId === location.id ? location.name : null,
    itemTypeId: input.itemTypeId ?? null,
    tags: input.tagIds?.includes(tag.id) ? [tag] : [],
    createdUtc: new Date().toISOString(),
    updatedUtc: null,
    mediaAssets: [],
    attributeValues: (input.attributeValues || []).map((value) => ({
      ...value,
      attributeName:
        definitions.find((field) => field.id === value.attributeDefinitionId)
          ?.name || "Unknown",
      attributeKey:
        definitions.find((field) => field.id === value.attributeDefinitionId)
          ?.key || "unknown",
      dataType:
        definitions.find((field) => field.id === value.attributeDefinitionId)
          ?.dataType || "Text",
    })),
  };
}
let scenario = "ok";
let refreshCount = 0;
let revocationCount = 0;
let collectionRequests = 0;
createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  if (request.url === "/health") return response.end("{}");
  if (request.method === "POST" && request.url?.startsWith("/scenario/")) {
    scenario = request.url.slice("/scenario/".length);
    resetPublications();
    refreshCount = 0;
    revocationCount = 0;
    collectionRequests = 0;
    collections =
      scenario === "empty" ? [] : structuredClone(initialCollections);
    items = ["browse", "insights", "showcase"].includes(scenario)
      ? Array.from({ length: 14 }, (_, index) =>
          makeItem(
            {
              name: `Shelf book ${String(index + 1).padStart(2, "0")}`,
              quantity: index + 1,
              tagIds: index % 2 ? [tag.id] : [],
              locationId: index % 2 ? location.id : null,
            },
            initialCollections[0].id,
          ),
        )
      : [];
    savedViews = [];
    presentations = {};
    showcaseSettings = {};
    definitions = [structuredClone(definition)];
    if (scenario === "showcase") {
      Object.assign(collections[0], {
        name: "The quiet library",
        category: "Stories & first editions",
        color: "clay",
        description:
          "A few good stories, a little margin for notes. Books gathered slowly, and returned to often.",
        coverImageUrl: "https://images.test/library.svg",
        itemLabel: "book",
        itemsLabel: "books",
      });
      const titles = [
        "Notes from the garden",
        "The art of noticing",
        "An atlas of small places",
        "Letters from the coast",
        "A season of quiet",
        "The long way home",
      ];
      items = items.slice(0, titles.length);
      items.forEach((item, index) => {
        item.name = titles[index];
        item.description = "A well-loved edition with a story of its own.";
        item.createdUtc = new Date(Date.UTC(2026, 9, index + 1)).toISOString();
        if (index % 2 === 0)
          item.mediaAssets = [
            {
              id: randomUUID(),
              url: `https://images.test/book-${index}.svg`,
              contentType: "image/svg+xml",
              fileName: "fixture.svg",
              sizeBytes: 100,
              isPrimary: true,
              uploadedUtc: item.createdUtc,
            },
          ];
      });
      presentations[collections[0].id] = {
        showCover: true,
        showSummary: true,
        showPinnedItems: true,
        showRecentItems: true,
        pinnedItemIds: [items[2].id, items[0].id, items[4].id],
      };
    }
    if (scenario === "insights")
      items.forEach((item, index) => {
        item.itemTypeId = type.id;
        item.attributeValues = [
          {
            attributeDefinitionId: definition.id,
            attributeName: definition.name,
            attributeKey: definition.key,
            dataType: "Text",
            value: index < 7 ? "First" : "First revised",
          },
        ];
      });
    return response.end("{}");
  }
  if (request.url === "/auth-stats") {
    return response.end(
      JSON.stringify({ refreshCount, revocationCount, collectionRequests }),
    );
  }
  if (request.url === "/oidc/.well-known/openid-configuration") {
    return response.end(
      JSON.stringify({
        issuer: "https://test.invalid/",
        authorization_endpoint: "https://test.invalid/authorize",
        token_endpoint: "https://test.invalid/oauth/token",
        revocation_endpoint: "https://test.invalid/oauth/revoke",
        end_session_endpoint: "https://test.invalid/oidc/logout",
        jwks_uri: "https://test.invalid/.well-known/jwks.json",
        response_types_supported: ["code"],
        subject_types_supported: ["public"],
        id_token_signing_alg_values_supported: ["RS256"],
        token_endpoint_auth_methods_supported: ["client_secret_post"],
      }),
    );
  }
  if (request.method === "POST" && request.url?.startsWith("/oidc/oauth/")) {
    let body = "";
    for await (const chunk of request) body += chunk;
    const params = new URLSearchParams(body);
    if (
      params.get("client_id") !== "test-client" ||
      params.get("client_secret") !== "test-client-secret"
    ) {
      response.statusCode = 401;
      return response.end('{"error":"invalid_client"}');
    }
    if (request.url === "/oidc/oauth/revoke") {
      revocationCount++;
      return response.end("{}");
    }
    if (request.url === "/oidc/oauth/token") {
      const expected = `fixture-refresh-${refreshCount}`;
      refreshCount++;
      if (
        scenario === "refresh-rejected" ||
        params.get("grant_type") !== "refresh_token" ||
        params.get("refresh_token") !== expected
      ) {
        response.statusCode = 400;
        return response.end(
          '{"error":"invalid_grant","error_description":"private refresh diagnostics"}',
        );
      }
      return response.end(
        JSON.stringify({
          access_token: `fixture-access-${refreshCount}`,
          refresh_token: `fixture-refresh-${refreshCount}`,
          token_type: "Bearer",
          // The first renewed token expires immediately to exercise rotation again.
          expires_in: refreshCount === 1 ? 0 : 3600,
          scope: "openid profile email offline_access",
        }),
      );
    }
  }
  const url = new URL(request.url, "http://127.0.0.1:3102");
  if (
    (url.pathname.startsWith("/showcases/") ||
      url.pathname === "/publication-fixture") &&
    (await publicationFixture(request, response, {
      collections,
      items,
      presentations,
      showcaseSettings,
    }))
  )
    return;
  if (url.pathname === "/fixture-image.png") {
    response.setHeader("Content-Type", "image/png");
    return response.end(
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=",
        "base64",
      ),
    );
  }
  collectionRequests++;
  const expectedAccess =
    refreshCount > 0
      ? `Bearer fixture-access-${refreshCount}`
      : "Bearer fixture-access-token";
  const send = (body, status = 200) => {
    response.statusCode = status;
    return response.end(status === 204 ? undefined : JSON.stringify(body));
  };
  if (request.headers.authorization !== expectedAccess) return send({}, 401);
  if (scenario === "error") return send({ private: "diagnostics" }, 503);
  if (url.pathname === "/tags") return send([tag]);
  if (url.pathname === "/locations") return send([location]);
  const segments = url.pathname.split("/").filter(Boolean);
  const collectionId = segments[1];
  if (url.pathname === "/collections") {
    if (request.method === "POST") {
      let body = "";
      for await (const chunk of request) body += chunk;
      const created = {
        ...JSON.parse(body),
        id: randomUUID(),
        createdUtc: new Date().toISOString(),
      };
      collections.unshift(created);
      return send(created, 201);
    }
    return send(collections);
  }
  if (!collections.some((c) => c.id === collectionId)) return send({}, 404);
  if (
    segments[2] === "publication" &&
    (await publicationFixture(request, response, {
      collections,
      items,
      presentations,
      showcaseSettings,
    }))
  )
    return;
  if (segments.length === 2 && request.method === "PUT") {
    let body = "";
    for await (const chunk of request) body += chunk;
    const input = JSON.parse(body);
    const collection = collections.find((c) => c.id === collectionId);
    Object.assign(collection, {
      name: input.name.trim(),
      category: input.category?.trim() || null,
      description: input.description?.trim() || null,
      coverImageUrl: input.coverImageUrl?.trim() || null,
      color: input.color || null,
    });
    return send(collection);
  }
  if (segments[2] === "vocabulary" && request.method === "PUT") {
    let body = "";
    for await (const chunk of request) body += chunk;
    const collection = collections.find((c) => c.id === collectionId);
    Object.assign(collection, JSON.parse(body));
    return send(collection);
  }
  if (segments[2] === "attribute-definitions") {
    const fields = definitions.filter(
      (field) => field.collectionId === collectionId,
    );
    if (request.method === "GET") return send(fields);
    const current = fields.find((field) => field.id === segments[3]);
    if (request.method !== "POST" && !current) return send({}, 404);
    if (request.method === "DELETE") {
      definitions = definitions.filter((field) => field !== current);
      for (const item of items)
        item.attributeValues = item.attributeValues.filter(
          (value) => value.attributeDefinitionId !== current.id,
        );
      return send(null, 204);
    }
    let body = "";
    for await (const chunk of request) body += chunk;
    const input = JSON.parse(body);
    const key = input.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    if (fields.some((field) => field !== current && field.key === key))
      return send({}, 400);
    if (current) {
      Object.assign(current, input, { key });
      for (const item of items)
        for (const value of item.attributeValues)
          if (value.attributeDefinitionId === current.id) {
            value.attributeName = current.name;
            value.attributeKey = key;
          }
      return send(current);
    }
    const created = {
      ...input,
      key,
      id: randomUUID(),
      collectionId,
      sortOrder: fields.length,
      createdUtc: new Date().toISOString(),
    };
    definitions.push(created);
    return send(created, 201);
  }
  if (segments[2] === "item-types")
    return send(collectionId === type.collectionId ? [type] : []);
  const ownItems = items.filter((item) => item.collectionId === collectionId);
  if (segments[2] === "showcase-settings") {
    if (request.method === "PUT") {
      let body = "";
      for await (const chunk of request) body += chunk;
      showcaseSettings[collectionId] = JSON.parse(body);
    }
    return send({
      collectionId,
      ...(showcaseSettings[collectionId] || {
        layout: "gallery",
        showGrowth: false,
        showTypes: false,
      }),
    });
  }
  if (segments[2] === "presentation") {
    if (request.method === "PUT") {
      let body = "";
      for await (const chunk of request) body += chunk;
      presentations[collectionId] = JSON.parse(body);
    }
    const input = presentations[collectionId] || {
      showCover: true,
      showSummary: true,
      showPinnedItems: true,
      showRecentItems: true,
      pinnedItemIds: [],
    };
    return send({
      collectionId,
      showCover: input.showCover,
      showSummary: input.showSummary,
      showPinnedItems: input.showPinnedItems,
      showRecentItems: input.showRecentItems,
      pinnedItems: input.pinnedItemIds
        .map((id) => ownItems.find((item) => item.id === id))
        .filter(Boolean)
        .map((item) => ({
          id: item.id,
          collectionId,
          name: item.name,
          description: item.description,
          createdUtc: item.createdUtc,
          primaryImageUrl:
            item.mediaAssets.find((asset) => asset.isPrimary)?.url ||
            item.mediaAssets[0]?.url ||
            null,
        })),
    });
  }
  if (segments[2] === "saved-views") {
    if (request.method === "POST") {
      let body = "";
      for await (const chunk of request) body += chunk;
      const saved = {
        ...JSON.parse(body),
        id: randomUUID(),
        collectionId,
        createdUtc: new Date().toISOString(),
      };
      savedViews.push(saved);
      return send(saved, 201);
    }
    if (request.method === "DELETE") {
      savedViews = savedViews.filter(
        (view) => view.id !== segments[3] || view.collectionId !== collectionId,
      );
      return send(null, 204);
    }
    return send(
      savedViews.filter((view) => view.collectionId === collectionId),
    );
  }
  if (segments[2] === "insights") {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, index) => {
      const fromUtc = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + index, 1),
      ).toISOString();
      const toUtc = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 10 + index, 1),
      ).toISOString();
      return {
        fromUtc,
        toUtc,
        count: ownItems.filter(
          (item) => item.createdUtc >= fromUtc && item.createdUtc < toUtc,
        ).length,
      };
    });
    const tagged = ownItems.filter((item) => item.tags.length).length,
      located = ownItems.filter((item) => item.locationId).length;
    return send({
      collectionId,
      summary: {
        collectionId,
        totalItems: ownItems.length,
        totalAttributeDefinitions: 1,
        tagsUsed: tagged ? 1 : 0,
        locationsUsed: located ? 1 : 0,
        itemsWithNoLocation: ownItems.length - located,
        itemsWithNoTags: ownItems.length - tagged,
        totalMediaAssets: 0,
      },
      reports: {
        itemsByLocation: ownItems.length
          ? [
              {
                locationId: null,
                locationName: "No Location",
                count: ownItems.length - located,
              },
              {
                locationId: location.id,
                locationName: location.name,
                count: located,
              },
            ]
          : [],
        itemsByTag: tagged
          ? [{ tagId: tag.id, tagName: tag.name, count: tagged }]
          : [],
      },
      itemsByType: ownItems.length
        ? [{ itemTypeId: type.id, name: type.name, count: ownItems.length }]
        : [],
      addedByMonth: months,
      attribute: url.searchParams.has("attributeDefinitionId")
        ? {
            definitionId: definition.id,
            key: definition.key,
            name: definition.name,
            totalWithValue: ownItems.length,
            values: ["First", "First revised"].map((value) => ({
              value,
              count: ownItems.filter((item) =>
                item.attributeValues.some(
                  (attribute) => attribute.value === value,
                ),
              ).length,
            })),
          }
        : null,
    });
  }
  if (segments[2] === "activity") {
    const page = Number(url.searchParams.get("page") || 1),
      pageSize = 8;
    return send({
      events: ownItems
        .slice((page - 1) * pageSize, page * pageSize)
        .map((item) => ({
          eventId: item.id,
          itemId: item.id,
          itemName: item.name,
          eventType: "Created",
          occurredUtc: item.createdUtc,
          occurredBy: "test-owner",
          notes: null,
        })),
      page,
      pageSize,
      totalCount: ownItems.length,
      totalPages: Math.ceil(ownItems.length / pageSize),
    });
  }
  if (segments[2] === "summary")
    return send({
      collectionId,
      totalItems: ownItems.length,
      totalAttributeDefinitions: 0,
      tagsUsed: 0,
      locationsUsed: 0,
      itemsWithNoLocation: ownItems.length,
      itemsWithNoTags: ownItems.length,
      totalMediaAssets: ownItems.reduce(
        (sum, item) => sum + item.mediaAssets.length,
        0,
      ),
    });
  if (segments[2] !== "items") return send({}, 404);
  const item = ownItems.find((item) => item.id === segments[3]);
  if (segments.length >= 4 && !item) return send({}, 404);
  if (segments[4] === "media") {
    if (request.method === "POST") {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const form = await new Response(Buffer.concat(chunks), {
        headers: { "Content-Type": request.headers["content-type"] },
      }).formData();
      const file = form.get("file");
      const media = {
        id: randomUUID(),
        url: "",
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
        isPrimary: !item.mediaAssets.length,
        uploadedUtc: new Date().toISOString(),
      };
      media.url = `/collections/${collectionId}/items/${item.id}/media/${media.id}/content`;
      item.mediaAssets.push(media);
      return send(media, 201);
    }
    const asset = item.mediaAssets.find((asset) => asset.id === segments[5]);
    if (!asset) return send({}, 404);
    if (request.method === "GET" && segments[6] === "content") {
      response.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "private, no-store",
      });
      return response.end(
        Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=",
          "base64",
        ),
      );
    }
    if (request.method === "PUT")
      item.mediaAssets.forEach(
        (media) => (media.isPrimary = media.id === asset.id),
      );
    if (request.method === "DELETE")
      item.mediaAssets = item.mediaAssets.filter(
        (media) => media.id !== asset.id,
      );
    return send(null, 204);
  }
  if (request.method === "DELETE" && item) {
    items = items.filter((entry) => entry.id !== item.id);
    return send(null, 204);
  }
  if (request.method === "PUT" || request.method === "POST") {
    let body = "";
    for await (const chunk of request) body += chunk;
    const input = JSON.parse(body);
    if (
      definitions.some(
        (field) =>
          field.collectionId === collectionId &&
          field.isRequired &&
          (!field.itemTypeId || field.itemTypeId === input.itemTypeId) &&
          !input.attributeValues?.some(
            (value) =>
              value.attributeDefinitionId === field.id && value.value.trim(),
          ),
      )
    )
      return send({}, 400);
    const saved = makeItem(input, collectionId);
    if (item) {
      Object.assign(item, {
        ...saved,
        id: item.id,
        createdUtc: item.createdUtc,
        updatedUtc: new Date().toISOString(),
        mediaAssets: item.mediaAssets,
      });
      return send({ ...item, mediaAssets: [] });
    }
    items.unshift(saved);
    return send(saved, 201);
  }
  if (item) return send(item);
  const params = url.searchParams;
  const tags = params.getAll("tagIds");
  const filtered = ownItems
    .filter(
      (item) =>
        (!params.get("createdAfter") ||
          item.createdUtc >= params.get("createdAfter")) &&
        (!params.get("createdBeforeExclusive") ||
          item.createdUtc < params.get("createdBeforeExclusive")) &&
        (params.get("hasNoItemType") !== "true" || !item.itemTypeId) &&
        (!params.get("exactAttributeKey") ||
          item.attributeValues.some(
            (value) =>
              value.attributeKey === params.get("exactAttributeKey") &&
              value.value === params.get("exactAttributeValue"),
          )),
    )
    .filter(
      (item) =>
        (!params.get("searchText") ||
          (item.name + " " + (item.description || ""))
            .toLowerCase()
            .includes(params.get("searchText").toLowerCase())) &&
        (!params.get("locationId") ||
          item.locationId === params.get("locationId")) &&
        (!params.get("itemTypeId") ||
          item.itemTypeId === params.get("itemTypeId")) &&
        (params.get("hasNoLocation") !== "true" || !item.locationId) &&
        (params.get("hasNoTags") !== "true" || !item.tags.length) &&
        (!tags.length ||
          (params.get("tagMatchMode") === "any"
            ? tags.some((id) => item.tags.some((tag) => tag.id === id))
            : tags.every((id) => item.tags.some((tag) => tag.id === id)))),
    );
  const sort = params.get("sortBy") || "createdUtc";
  filtered.sort(
    (a, b) =>
      (typeof a[sort] === "number"
        ? a[sort] - b[sort]
        : String(a[sort]).localeCompare(String(b[sort]))) *
      (params.get("sortDirection") === "asc" ? 1 : -1),
  );
  const page = Number(params.get("page") || 1),
    pageSize = Number(params.get("pageSize") || 6);
  return send({
    items: filtered
      .slice((page - 1) * pageSize, page * pageSize)
      .map((item) => ({
        ...item,
        tags: item.tags.map((tag) => tag.name),
        attributeValueCount: item.attributeValues.length,
        primaryImageUrl:
          item.mediaAssets.find((asset) => asset.isPrimary)?.url || null,
      })),
    totalCount: filtered.length,
    page,
    pageSize,
    totalPages: Math.ceil(filtered.length / pageSize),
  });
}).listen(3102, "127.0.0.1");
