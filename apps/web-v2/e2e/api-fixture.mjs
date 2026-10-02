import { createServer } from "node:http";
const collections = [
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
let scenario = "ok";
createServer((request, response) => {
  response.setHeader("Content-Type", "application/json");
  if (request.url === "/health") return response.end("{}");
  if (request.method === "POST" && request.url?.startsWith("/scenario/")) {
    scenario = request.url.slice("/scenario/".length);
    return response.end("{}");
  }
  if (request.url !== "/collections") {
    response.statusCode = 404;
    return response.end("{}");
  }
  if (request.headers.authorization !== "Bearer fixture-access-token") {
    response.statusCode = 401;
    return response.end("{}");
  }
  if (scenario === "error") {
    response.statusCode = 503;
    return response.end('{"private":"diagnostics"}');
  }
  response.end(JSON.stringify(scenario === "empty" ? [] : collections));
}).listen(3102, "127.0.0.1");
