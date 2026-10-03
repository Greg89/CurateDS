import { readFile, writeFile } from "node:fs/promises";
import openapiTS, { astToString } from "openapi-typescript";

// Keep only the operations consumed by the collection overview and creation flows.
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
    ["/collections/{collectionId}/summary", ["get"]],
    ["/collections/{collectionId}/items", ["get", "post"]],
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
