const defaultApiBaseUrl = import.meta.env.DEV ? "http://localhost:8080" : "";

export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl,
  auth0Domain: import.meta.env.VITE_AUTH0_DOMAIN ?? "",
  auth0ClientId: import.meta.env.VITE_AUTH0_CLIENT_ID ?? "",
  auth0Audience: import.meta.env.VITE_AUTH0_AUDIENCE ?? ""
};
