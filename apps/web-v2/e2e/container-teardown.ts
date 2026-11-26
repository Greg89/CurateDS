import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync } from "node:fs";

// Windows can terminate the runner before its signal handler runs. Playwright's
// parent process owns this final cleanup; target only our named, labelled fixture.
export default function teardown() {
  if (!process.env.PLAYWRIGHT_DOCKER_IMAGE) return;
  const file = new URL("../.next/browser-container.txt", import.meta.url);
  if (!existsSync(file)) return;
  const name = readFileSync(file, "utf8");
  if (!/^curateds-web-regression-\d+$/.test(name))
    throw new Error("Invalid fixture container name");
  const found = execFileSync(
    "docker",
    [
      "ps",
      "-aq",
      "--filter",
      `name=^/${name}$`,
      "--filter",
      "label=curateds.browser-fixture=true",
    ],
    { encoding: "utf8" },
  ).trim();
  if (found)
    execFileSync("docker", ["stop", "--time", "5", name], { stdio: "ignore" });
  unlinkSync(file);
}
