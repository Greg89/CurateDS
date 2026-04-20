const defaultApiBaseUrl = "http://localhost:8080";

export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl
};
