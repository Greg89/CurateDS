// Loaded only by the Playwright standalone-server command. Keep the production
// Auth0 client intact while routing the reserved test issuer to a local fixture.
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input);
  if (url.origin === "https://test.invalid") {
    return originalFetch(
      `http://127.0.0.1:3102/oidc${url.pathname}${url.search}`,
      init,
    );
  }
  return originalFetch(input, init);
};
