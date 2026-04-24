import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

const apiBaseUrl = "http://localhost:8080";

export const defaultCollection = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Records",
  createdUtc: "2026-04-20T00:00:00Z"
};

export const defaultAttributeDefinition = {
  id: "22222222-2222-2222-2222-222222222222",
  collectionId: defaultCollection.id,
  name: "Release Year",
  key: "release-year",
  dataType: "Number",
  isRequired: false,
  isFilterable: true,
  sortOrder: 0,
  createdUtc: "2026-04-20T00:05:00Z"
};

export const defaultItemSummary = {
  id: "33333333-3333-3333-3333-333333333333",
  collectionId: defaultCollection.id,
  name: "Kind of Blue",
  description: "Mono pressing",
  quantity: 1,
  locationId: null,
  locationName: null,
  tags: [],
  attributeValueCount: 1,
  createdUtc: "2026-04-20T00:10:00Z",
  updatedUtc: "2026-04-20T00:10:00Z"
};

export const defaultItemDetail = {
  id: defaultItemSummary.id,
  collectionId: defaultCollection.id,
  name: "Kind of Blue",
  description: "Mono pressing",
  quantity: 1,
  locationId: null,
  locationName: null,
  tags: [],
  createdUtc: "2026-04-20T00:10:00Z",
  updatedUtc: "2026-04-20T00:10:00Z",
  attributeValues: [
    {
      attributeDefinitionId: defaultAttributeDefinition.id,
      attributeName: "Release Year",
      attributeKey: "release-year",
      dataType: "Number",
      value: "1959"
    }
  ]
};

export const server = setupServer(
  http.get(`${apiBaseUrl}/collections`, () =>
    HttpResponse.json([defaultCollection])),
  http.post(`${apiBaseUrl}/collections`, async ({ request }) => {
    const body = (await request.json()) as { name?: string };

    return HttpResponse.json(
      {
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        name: body.name ?? "Untitled",
        createdUtc: "2026-04-21T00:00:00Z"
      },
      { status: 201 }
    );
  }),
  http.get(
    `${apiBaseUrl}/collections/:collectionId/attribute-definitions`,
    () => HttpResponse.json([defaultAttributeDefinition])
  ),
  http.post(
    `${apiBaseUrl}/collections/:collectionId/attribute-definitions`,
    async ({ params, request }) => {
      const body = (await request.json()) as {
        name?: string;
        dataType?: string;
        isRequired?: boolean;
        isFilterable?: boolean;
      };

      return HttpResponse.json(
        {
          id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          collectionId: params.collectionId,
          name: body.name ?? "Attribute",
          key: (body.name ?? "attribute").toLowerCase().replace(/\s+/g, "-"),
          dataType: body.dataType ?? "Text",
          isRequired: body.isRequired ?? false,
          isFilterable: body.isFilterable ?? true,
          sortOrder: 1,
          createdUtc: "2026-04-21T00:05:00Z"
        },
        { status: 201 }
      );
    }
  ),
  http.get(`${apiBaseUrl}/collections/:collectionId/items`, () =>
    HttpResponse.json([defaultItemSummary])),
  http.post(
    `${apiBaseUrl}/collections/:collectionId/items`,
    async ({ params, request }) => {
      const body = (await request.json()) as {
        name?: string;
        description?: string | null;
        quantity?: number;
      };

      return HttpResponse.json(
        {
          ...defaultItemDetail,
          id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
          collectionId: params.collectionId,
          name: body.name ?? "New Item",
          description: body.description ?? null,
          quantity: body.quantity ?? 1
        },
        { status: 201 }
      );
    }
  ),
  http.put(`${apiBaseUrl}/collections/:collectionId/items/:itemId`, async ({ params, request }) => {
    const body = (await request.json()) as {
      name?: string;
      description?: string | null;
      quantity?: number;
    };

    return HttpResponse.json({
      ...defaultItemDetail,
      id: params.itemId,
      collectionId: params.collectionId,
      name: body.name ?? defaultItemDetail.name,
      description: body.description ?? defaultItemDetail.description,
      quantity: body.quantity ?? defaultItemDetail.quantity
    });
  }),
  http.get(
    `${apiBaseUrl}/collections/:collectionId/items/:itemId`,
    ({ params }) =>
      HttpResponse.json({
        ...defaultItemDetail,
        id: params.itemId,
        collectionId: params.collectionId
      })
  ),
  http.get(`${apiBaseUrl}/tags`, () => HttpResponse.json([])),
  http.post(`${apiBaseUrl}/tags`, async ({ request }) => {
    const body = (await request.json()) as { name?: string };

    return HttpResponse.json(
      {
        id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
        name: body.name ?? "Tag",
        key: (body.name ?? "tag").toLowerCase().replace(/\s+/g, "-"),
        createdUtc: "2026-04-21T00:07:00Z"
      },
      { status: 201 }
    );
  }),
  http.get(`${apiBaseUrl}/locations`, () => HttpResponse.json([])),
  http.post(`${apiBaseUrl}/locations`, async ({ request }) => {
    const body = (await request.json()) as {
      name?: string;
      description?: string | null;
    };

    return HttpResponse.json(
      {
        id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
        name: body.name ?? "Location",
        description: body.description ?? null,
        createdUtc: "2026-04-21T00:09:00Z"
      },
      { status: 201 }
    );
  }),
  http.get(`${apiBaseUrl}/health`, () => HttpResponse.json({ status: "Healthy" }))
);
