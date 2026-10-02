import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { parseEnv } from "node:util";

const target = new URL("../.env.local", import.meta.url);
let existing = {};
try {
  existing = parseEnv(await readFile(target, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
let shared = {};
try {
  shared = parseEnv(await readFile(new URL("../../../.env", import.meta.url), "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const values = {
  APP_BASE_URL: "http://localhost:3001",
  AUTH0_DOMAIN: shared.AUTH0_DOMAIN ?? "",
  // The existing web uses a SPA client; do not reuse its client ID for Next.js.
  AUTH0_CLIENT_ID: "",
  AUTH0_CLIENT_SECRET: "",
  AUTH0_SECRET: randomBytes(32).toString("hex"),
  AUTH0_AUDIENCE: shared.AUTH0_AUDIENCE ?? "",
  API_BASE_URL: "http://localhost:8080",
};
try {
  await writeFile(target, Object.entries(values).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join("\n") + "\n", { flag: "wx", mode: 0o600 });
  console.log("Created apps/web-v2/.env.local with a new cookie secret. Credentials were not printed.");
  existing = values;
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log("Kept the existing apps/web-v2/.env.local unchanged.");
}
const missing = Object.keys(values).filter((key) => !existing[key]?.trim());
console.log(missing.length ? `Still needed: ${missing.join(", ")}` : "All required values are present. Live sign-in still needs validation.");
