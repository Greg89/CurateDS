import { cp } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const appRoot = new URL("../", import.meta.url);
const output = new URL(".next/standalone/apps/web-v2/", appRoot);
await cp(new URL(".next/static/", appRoot), new URL(".next/static/", output), {
  recursive: true,
});
await cp(new URL("public/", appRoot), new URL("public/", output), {
  recursive: true,
});
await cp(new URL("assets/", appRoot), new URL("assets/", output), {
  recursive: true,
});
process.env.PORT ??= "3001";
process.env.HOSTNAME ??= "127.0.0.1";
process.chdir(fileURLToPath(appRoot));
await import(new URL("server.js", output).href);
