import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
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
let scenario = "ok";
let refreshCount = 0;
let revocationCount = 0;
let collectionRequests = 0;
createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  if (request.url === "/health") return response.end("{}");
  if (request.method === "POST" && request.url?.startsWith("/scenario/")) {
    scenario = request.url.slice("/scenario/".length);
    refreshCount = 0;
    revocationCount = 0;
    collectionRequests = 0;
    collections =
      scenario === "empty" ? [] : structuredClone(initialCollections);
    items = [];
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
  if (!url.pathname.startsWith("/collections")) {
    response.statusCode = 404;
    return response.end("{}");
  }
  collectionRequests++;
  const expectedAccess =
    refreshCount > 0
      ? `Bearer fixture-access-${refreshCount}`
      : "Bearer fixture-access-token";
  if (request.headers.authorization !== expectedAccess) {
    response.statusCode = 401;
    return response.end("{}");
  }
  if (scenario === "error") {
    response.statusCode = 503;
    return response.end('{"private":"diagnostics"}');
  }
  if (request.method === "POST") {
    let body = "";
    for await (const chunk of request) body += chunk;
    const input = JSON.parse(body);
    if (url.pathname === "/collections") {
      const created = {
        ...input,
        id: randomUUID(),
        createdUtc: new Date().toISOString(),
      };
      collections.unshift(created);
      response.statusCode = 201;
      return response.end(JSON.stringify(created));
    }
    const collectionId = url.pathname.split("/")[2];
    if (!collections.some((c) => c.id === collectionId)) {
      response.statusCode = 404;
      return response.end("{}");
    }
    const item = {
      ...input,
      id: randomUUID(),
      collectionId,
      createdUtc: new Date().toISOString(),
      primaryImageUrl: null,
    };
    items.unshift(item);
    response.statusCode = 201;
    return response.end(JSON.stringify(item));
  }
  if (url.pathname === "/collections")
    return response.end(JSON.stringify(collections));
  const collectionId = url.pathname.split("/")[2];
  if (!collections.some((c) => c.id === collectionId)) {
    response.statusCode = 404;
    return response.end("{}");
  }
  const ownItems = items.filter((item) => item.collectionId === collectionId);
  if (url.pathname.endsWith("/summary"))
    return response.end(
      JSON.stringify({
        collectionId,
        totalItems: ownItems.length,
        totalAttributeDefinitions: 0,
        tagsUsed: 0,
        locationsUsed: 0,
        itemsWithNoLocation: ownItems.length,
        itemsWithNoTags: ownItems.length,
        totalMediaAssets: 0,
      }),
    );
  if (url.pathname.endsWith("/items"))
    return response.end(
      JSON.stringify({
        items: ownItems.slice(0, 6),
        totalCount: ownItems.length,
        page: 1,
        pageSize: 6,
        totalPages: Math.ceil(ownItems.length / 6),
      }),
    );
  response.statusCode = 404;
  response.end("{}");
}).listen(3102, "127.0.0.1");
