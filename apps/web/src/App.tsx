import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router";
import { useAuth0 } from "@auth0/auth0-react";
import { CatalogApp } from "./catalog/CatalogApp";

export function App() {
  const { isLoading, isAuthenticated, loginWithRedirect, error } = useAuth0();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !error) {
      void loginWithRedirect();
    }
  }, [isLoading, isAuthenticated, loginWithRedirect, error]);

  if (error) {
    return (
      <div style={{ padding: "2rem", color: "oklch(0.98 0 0)" }}>
        <p>Authentication error: {error.message}</p>
      </div>
    );
  }

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <Routes>
      <Route path="/" element={<CatalogApp section="overview" />} />
      <Route
        path="/collections/:collectionId"
        element={<Navigate replace to="overview" />}
      />
      <Route
        path="/collections/:collectionId/overview"
        element={<CatalogApp section="overview" />}
      />
      <Route
        path="/collections/:collectionId/items"
        element={<CatalogApp section="items" />}
      />
      <Route
        path="/collections/:collectionId/reports"
        element={<CatalogApp section="reports" />}
      />
      <Route
        path="/collections/:collectionId/settings"
        element={<CatalogApp section="settings" />}
      />
    </Routes>
  );
}
