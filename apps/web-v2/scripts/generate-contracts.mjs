import { readFile, writeFile } from "node:fs/promises";
import openapiTS, { astToString } from "openapi-typescript";

// Keep only the operations consumed by the V2 collection workspace.
// Omit the URL argument to regenerate from the checked-in snapshot without a running API.
const snapshot = new URL(
  "../src/lib/generated/collections.openapi.json",
  import.meta.url,
);
const source = process.argv[2];
let document;
if (source) {
  const response = await fetch(source);
  if (!response.ok)
    throw new Error(`OpenAPI request failed: ${response.status}`);
  const full = await response.json();
  const path = Object.keys(full.paths).find(
    (entry) => entry.replace(/\/$/, "") === "/collections",
  );
  if (!path || !full.paths[path].get)
    throw new Error("Collection list operation missing from OpenAPI.");
  document = {
    openapi: full.openapi,
    info: full.info,
    paths: {},
    components: { schemas: {} },
  };
  for (const [pattern, methods] of [
    ["/collections", ["get", "post"]],
    ["/collections/{collectionId}", ["put"]],
    ["/collections/{collectionId}/vocabulary", ["put"]],
    ["/collections/{collectionId}/presentation", ["get", "put"]],
    ["/collections/{collectionId}/showcase-settings", ["get", "put"]],
    ["/collections/{collectionId}/summary", ["get"]],
    ["/collections/{collectionId}/insights", ["get"]],
    ["/collections/{collectionId}/activity", ["get"]],
    ["/collections/{collectionId}/saved-views", ["get", "post"]],
    ["/collections/{collectionId}/saved-views/{viewId}", ["delete"]],
    ["/collections/{collectionId}/items", ["get", "post"]],
    ["/collections/{collectionId}/items/{itemId}", ["get", "put", "delete"]],
    ["/collections/{collectionId}/attribute-definitions", ["get", "post"]],
    [
      "/collections/{collectionId}/attribute-definitions/{attributeDefinitionId}",
      ["put", "delete"],
    ],
    ["/collections/{collectionId}/item-types", ["get"]],
    ["/tags", ["get"]],
    ["/locations", ["get"]],
    ["/collections/{collectionId}/items/{itemId}/media", ["post"]],
    [
      "/collections/{collectionId}/items/{itemId}/media/{mediaAssetId}",
      ["delete"],
    ],
    [
      "/collections/{collectionId}/items/{itemId}/media/{mediaAssetId}/primary",
      ["put"],
    ],
  ]) {
    const key = Object.keys(full.paths).find(
      (entry) => entry.replace(/\/$/, "") === pattern,
    );
    if (!key) throw new Error(`Missing API path: ${pattern}`);
    document.paths[key] = {};
    for (const method of methods) {
      if (!full.paths[key][method])
        throw new Error(`Missing ${method} ${pattern}`);
      document.paths[key][method] = full.paths[key][method];
    }
  }
  const visited = new Set();
  function collect(value) {
    if (!value || typeof value !== "object") return;
    if (value.$ref) {
      const prefix = "#/components/schemas/";
      if (!value.$ref.startsWith(prefix))
        throw new Error(`Unsupported component reference: ${value.$ref}`);
      const name = value.$ref.slice(prefix.length);
      if (!visited.has(name)) {
        visited.add(name);
        const schema = full.components.schemas[name];
        if (!schema) throw new Error(`Missing schema: ${name}`);
        document.components.schemas[name] = schema;
        collect(schema);
      }
    }
    Object.values(value).forEach(collect);
  }
  collect(document.paths);
  if (!document.components.schemas.CollectionResponse)
    throw new Error("CollectionResponse metadata is missing.");
  await writeFile(snapshot, JSON.stringify(document, null, 2) + "\n");
} else {
  document = JSON.parse(await readFile(snapshot, "utf8"));
}
await writeFile(
  new URL("../src/lib/generated/api.d.ts", import.meta.url),
  astToString(await openapiTS(document)),
);
