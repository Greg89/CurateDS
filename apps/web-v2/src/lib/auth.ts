import "server-only";
import { Auth0Client } from "@auth0/nextjs-auth0/server";

const required = [
  "APP_BASE_URL",
  "AUTH0_DOMAIN",
  "AUTH0_CLIENT_ID",
  "AUTH0_CLIENT_SECRET",
  "AUTH0_SECRET",
  "AUTH0_AUDIENCE",
] as const;
export function isAuthConfigured() {
  return required.every((key) => Boolean(process.env[key]?.trim()));
}

let client: Auth0Client | undefined;
export function getAuthClient() {
  if (!isAuthConfigured()) throw new Error("Sign-in is not configured.");
  client ??= new Auth0Client({
    appBaseUrl: process.env.APP_BASE_URL,
    authorizationParameters: {
      audience: process.env.AUTH0_AUDIENCE,
      scope: "openid profile email offline_access",
    },
    signInReturnToPath: "/collections",
    enableAccessTokenEndpoint: false,
  });
  return client;
}
