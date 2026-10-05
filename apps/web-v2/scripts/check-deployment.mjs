import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
function assert(value, message) {
  if (!value) throw new Error(message);
}
export async function checkDeployment(
  value,
  { fetcher = fetch, log = console.log } = {},
) {
  const url = new URL(value);
  assert(
    !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash &&
      (url.protocol === "https:" ||
        (url.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))),
    "Use an exact HTTPS origin or loopback HTTP.",
  );
  const origin = url.origin;
  const get = (path) =>
    fetcher(origin + path, {
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
  const health = await get("/health");
  assert(
    health.status === 200 &&
      (await health.json()).application === "curateds-web-v2",
    "V2 readiness failed.",
  );
  assert(
    !health.headers.has("set-cookie"),
    "Readiness changed an account session.",
  );
  log("PASS: V2 readiness and API connectivity.");
  const home = await get("/");
  assert(home.status === 200, "Landing page failed.");
  const html = await home.text();
  assert(
    html.includes("/auth/login?returnTo=") && html.includes("CurateDS"),
    "V2 sign-in entry is missing.",
  );
  const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(
    (match) => new URL(match[1].replaceAll("&amp;", "&"), origin),
  );
  assert(
    scripts.some((script) => script.pathname.startsWith("/_next/")),
    "V2 client assets are missing.",
  );
  for (const script of scripts) {
    assert(script.origin === origin, "Unexpected script origin.");
    const asset = await get(script.pathname + script.search);
    assert(
      asset.status === 200 &&
        /javascript/.test(asset.headers.get("content-type") ?? ""),
      "Client JavaScript is unavailable.",
    );
    await asset.body?.cancel();
  }
  log("PASS: landing page and client JavaScript.");
  const denied = await get("/api/collections");
  assert(
    denied.status === 401,
    "Anonymous collection API access did not fail closed.",
  );
  await denied.body?.cancel();
  const protectedPage = await get("/collections");
  assert(
    protectedPage.status === 307 &&
      new URL(protectedPage.headers.get("location"), origin).pathname ===
        "/auth/login",
    "Protected page did not require sign-in.",
  );
  await protectedPage.body?.cancel();
  const login = await get("/auth/login?returnTo=%2Fcollections");
  assert([302, 307].includes(login.status), "Login redirect failed.");
  const authorize = new URL(login.headers.get("location"));
  assert(
    authorize.protocol === "https:" &&
      authorize.searchParams.get("redirect_uri") ===
        origin + "/auth/callback" &&
      authorize.searchParams.get("code_challenge_method") === "S256",
    "Auth0 callback origin or PKCE is incorrect.",
  );
  await login.body?.cancel();
  log("PASS: anonymous denial, login redirect, callback origin, and PKCE.");
  const missing = await get("/showcase/cutover-missing-" + crypto.randomUUID());
  assert(
    missing.status === 404 &&
      /no-store/.test(missing.headers.get("cache-control") ?? "") &&
      !missing.headers.has("set-cookie"),
    "Missing public showcase boundary failed.",
  );
  assert(
    !(await missing.text()).includes('property="og:image"'),
    "Missing showcase leaked social metadata.",
  );
  const css = await get("/showcase.css");
  assert(
    css.status === 200 &&
      /text\/css/.test(css.headers.get("content-type") ?? ""),
    "Showcase stylesheet failed.",
  );
  await css.body?.cancel();
  log("PASS: public error boundary and stylesheet.");
  log(
    "Read-only deployment smoke passed. Live sign-in, owner workflows, storage privacy, and publication lifecycle still require beta acceptance.",
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const { values } = parseArgs({ options: { origin: { type: "string" } } });
    await checkDeployment(values.origin);
  } catch {
    console.error(
      "FAIL: deployment smoke failed. Check readiness, Auth0 settings, and deployed routes; no response bodies or secrets were logged.",
    );
    process.exitCode = 1;
  }
}
