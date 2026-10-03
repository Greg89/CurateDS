import { generateSessionCookie } from "@auth0/nextjs-auth0/testing";
import { testSecret } from "../playwright.config";
export async function signIn(
  context: import("@playwright/test").BrowserContext,
  options: { expired?: boolean; refreshToken?: string } = {},
) {
  const value = await generateSessionCookie(
    {
      user: { sub: "auth0|fixture", name: "Alex Collector" },
      tokenSet: {
        accessToken: "fixture-access-token",
        expiresAt:
          Math.floor(Date.now() / 1000) + (options.expired ? -60 : 3600),
        refreshToken: options.refreshToken,
        audience: "https://curateds.test",
        scope: "openid profile email offline_access",
      },
    },
    { secret: testSecret },
  );
  await context.addCookies([
    {
      name: "__session",
      value,
      url: "http://127.0.0.1:3101",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
