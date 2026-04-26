import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./src/mocks/server";

// Mock Auth0 — plain functions (not vi.fn()) because this factory is hoisted
// by Vitest and vi is not in scope inside the hoisted factory block.
vi.mock("@auth0/auth0-react", () => ({
  useAuth0: () => ({
    isLoading: false,
    isAuthenticated: true,
    loginWithRedirect: () => Promise.resolve(),
    logout: () => {},
    getAccessTokenSilently: () => Promise.resolve("test-token")
  }),
  Auth0Provider: ({ children }: { children: React.ReactNode }) => children
}));

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  window.localStorage.clear();
});

afterAll(() => {
  server.close();
});
