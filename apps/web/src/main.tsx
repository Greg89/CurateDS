import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { appConfig } from "./config";
import { setTokenProvider } from "./api";
import "./styles.css";

const queryClient = new QueryClient();

function AuthTokenProvider({ children }: { children: React.ReactNode }) {
  const { getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    setTokenProvider(() =>
      getAccessTokenSilently({
        authorizationParams: { audience: appConfig.auth0Audience }
      })
    );
  }, [getAccessTokenSilently]);

  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Auth0Provider
      domain={appConfig.auth0Domain}
      clientId={appConfig.auth0ClientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: appConfig.auth0Audience
      }}
    >
      <AuthTokenProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </AuthTokenProvider>
    </Auth0Provider>
  </React.StrictMode>
);
