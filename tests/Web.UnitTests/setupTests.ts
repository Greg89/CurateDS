import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./src/mocks/server";

// Mock Auth0 so tests don't need a real Auth0Provider.
// useAuth0 returns an already-authenticated state and a stub token getter.
vi.mock("@auth0/auth0-react", () => ({
  useAuth0: () => ({
    isLoading: false,
    isAuthenticated: true,
    loginWithRedirect: vi.fn(),
    logout: vi.fn(),
    getAccessTokenSilently: vi.fn().mockResolvedValue("test-token")
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
