// Mounted only by the Docker browser test runner; never copied into the runtime image.
await import("./api-fixture.mjs");
await import("/app/apps/web-v2/server.js");
