import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { pathToFileURL } from "node:url";
import { chromium, type BrowserContext } from "@playwright/test";
import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { generateSessionCookie } from "@auth0/nextjs-auth0/testing";
import { NextRequest } from "next/server.js";

const sessionCookie = /^__session(?:\.\d+)?$/;
class CheckError extends Error {}

export async function readSession(
  context: BrowserContext,
  auth: Auth0Client,
  origin: string,
) {
  const cookies = await context.cookies(origin);
  return auth.getSession(new NextRequest(`${origin}/api/collections`, {
    headers: { cookie: cookies.map(({ name, value }) => `${name}=${value}`).join("; ") },
  }));
}

// Retain the actual login identity and credentials. Expire only the SDK's local
// access-token timestamp so the normal application route must renew the token.
export async function expireAccessToken(
  context: BrowserContext,
  auth: Auth0Client,
  origin: string,
  secret: string,
) {
  const session = await readSession(context, auth, origin);
  if (!session?.tokenSet.refreshToken) {
    throw new CheckError("No refresh token: enable the application's refresh-token grant and the API's offline access, then sign in again.");
  }
  session.tokenSet.expiresAt = Math.floor(Date.now() / 1000) - 60;
  const value = await generateSessionCookie(session, { secret });
  await context.clearCookies({ name: sessionCookie });
  const chunks = value.match(/.{1,3500}/g)!;
  await context.addCookies(chunks.map((chunk, index) => ({
    name: chunks.length === 1 ? "__session" : `__session.${index}`,
    value: chunk,
    url: origin,
    httpOnly: true,
    secure: new URL(origin).protocol === "https:",
    sameSite: "Lax" as const,
  })));
}

async function main() {
  const env = parseEnv(await readFile(new URL("../.env.local", import.meta.url), "utf8"));
  const required = ["APP_BASE_URL", "AUTH0_DOMAIN", "AUTH0_CLIENT_ID", "AUTH0_CLIENT_SECRET", "AUTH0_SECRET", "AUTH0_AUDIENCE"];
  if (required.some(key => !env[key]?.trim())) {
    throw new Error("Complete the required .env.local settings first.");
  }
  const base = new URL(env.APP_BASE_URL!);
  if (base.origin !== "http://localhost:3001") {
    throw new Error("This interactive check is restricted to http://localhost:3001.");
  }
  const origin = base.origin;
  const auth = new Auth0Client({
    appBaseUrl: origin,
    domain: env.AUTH0_DOMAIN,
    clientId: env.AUTH0_CLIENT_ID,
    clientSecret: env.AUTH0_CLIENT_SECRET,
    secret: env.AUTH0_SECRET,
    authorizationParameters: { audience: env.AUTH0_AUDIENCE },
    enableAccessTokenEndpoint: false,
  });
  const health = await fetch(origin, { signal: AbortSignal.timeout(5000) });
  if (!health.ok) throw new Error("Start the V2 app on localhost:3001 first.");
  if (process.argv.includes("--check")) {
    console.log("Local configuration and app availability checks passed. No credentials printed.");
    return;
  }

  const browser = await chromium.launch({
    headless: false,
    channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
  });
  const context = await browser.newContext({ baseURL: origin });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  let stage = "initial sign-in";
  try {
    console.log("Sign in normally in the separate browser window. Waiting up to five minutes.");
    await page.goto(`${origin}/auth/login?returnTo=%2Fcollections`);
    await page.waitForURL(`${origin}/collections`, { timeout: 300_000 });
    await page.waitForLoadState("networkidle");
    const initial = await context.request.get("/api/collections");
    if (initial.status() !== 200) throw new Error("Authenticated collection access failed.");
    console.log("PASS: live login, callback, and authenticated collection access.");

    // Stop client queries while deliberately expiring the test session, avoiding
    // concurrent refreshes that could trip rotation/reuse detection.
    await page.goto("about:blank");
    for (let round = 1; round <= 2; round++) {
      stage = `refresh ${round}`;
      await expireAccessToken(context, auth, origin, env.AUTH0_SECRET!);
      const response = await context.request.get("/api/collections");
      if (response.status() !== 200) throw new Error("The refreshed session could not access the API.");
      const session = await readSession(context, auth, origin);
      if (!session || session.tokenSet.expiresAt <= Date.now() / 1000) {
        throw new Error("The renewed token was not persisted in the session cookie.");
      }
      console.log(`PASS: live refresh ${round}, API access, and updated session cookie.`);
    }

    stage = "logout";
    await page.goto(`${origin}/auth/logout`);
    await page.waitForURL(`${origin}/`, { timeout: 120_000 });
    if (await readSession(context, auth, origin)) throw new Error("The app session remains after logout.");
    if ((await context.request.get("/api/collections")).status() !== 401) {
      throw new Error("The collection API remained accessible after logout.");
    }
    const denied = await context.request.get("/collections", { maxRedirects: 0 });
    if (denied.status() !== 307 || !denied.headers().location?.includes("/auth/login")) {
      throw new Error("The protected page did not redirect to sign-in after logout.");
    }
    console.log("PASS: live logout return, session removal, and protected-route denial.");

    stage = "sign-in after logout";
    console.log("Sign in once more in the same window to finish the return-after-logout check.");
    await page.goto(`${origin}/auth/login?returnTo=%2Fcollections`);
    await page.waitForURL(`${origin}/collections`, { timeout: 300_000 });
    if ((await context.request.get("/api/collections")).status() !== 200) {
      throw new Error("Collection access failed after signing in again.");
    }
    console.log("PASS: sign-in and authenticated API access after logout.");
    await page.goto(`${origin}/auth/logout`);
    await page.waitForURL(`${origin}/`, { timeout: 120_000 });
    console.log("Live Auth0 acceptance passed. The isolated test session has been signed out.");
  } catch (error) {
    // Browser errors can contain callback URLs, and SDK errors may contain token
    // details. Report the stage only; never persist cookies, traces, or raw errors.
    console.error(`Live Auth0 acceptance stopped during ${stage}. Check the browser and tenant settings; no credentials were logged.`);
    if (error instanceof CheckError) console.error(error.message);
    process.exitCode = 1;
  } finally {
    await context.close();
    await browser.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    console.error("Live Auth0 check could not start. Check .env.local, the running app, and browser availability.");
    process.exitCode = 1;
  });
}
