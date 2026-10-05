import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
const name = `curateds-web-regression-${process.pid}`;
const image = process.env.PLAYWRIGHT_DOCKER_IMAGE;
if (!image)
  throw new Error(
    "Set PLAYWRIGHT_DOCKER_IMAGE to the locally built web image.",
  );
const fixture = fileURLToPath(new URL("../e2e", import.meta.url));
mkdirSync(new URL("../.next/", import.meta.url), { recursive: true });
writeFileSync(new URL("../.next/browser-container.txt", import.meta.url), name);
const child = spawn(
  "docker",
  [
    "run",
    "--rm",
    "--name",
    name,
    "--label",
    "curateds.browser-fixture=true",
    "--publish",
    "127.0.0.1:3101:8080",
    "--publish",
    "127.0.0.1:3102:3102",
    "--mount",
    `type=bind,source=${fixture},target=/tmp/curateds-e2e,readonly`,
    ...[
      "APP_BASE_URL",
      "AUTH0_DOMAIN",
      "AUTH0_CLIENT_ID",
      "AUTH0_CLIENT_SECRET",
      "AUTH0_SECRET",
      "AUTH0_AUDIENCE",
    ].flatMap((key) => ["--env", key]),
    "--env",
    "API_BASE_URL=http://127.0.0.1:3102",
    "--env",
    "FIXTURE_HOST=0.0.0.0",
    "--env",
    "PORT=8080",
    "--env",
    "HOSTNAME=0.0.0.0",
    image,
    "node",
    "--import",
    "/tmp/curateds-e2e/auth-transport.mjs",
    "/tmp/curateds-e2e/container-entry.mjs",
  ],
  { stdio: "inherit" },
);
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  spawnSync("docker", ["stop", "--time", "5", name], { stdio: "ignore" });
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
process.on("exit", stop);
child.on("error", () => {
  process.exitCode = 1;
});
child.on("exit", (code) => {
  stopping = true;
  process.exitCode = code ?? 1;
});
