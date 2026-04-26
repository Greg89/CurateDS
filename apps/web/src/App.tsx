import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { CatalogApp } from "./catalog/CatalogApp";

export function App() {
  const { isLoading, isAuthenticated, loginWithRedirect } = useAuth0();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void loginWithRedirect();
    }
  }, [isLoading, isAuthenticated, loginWithRedirect]);

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
        path="/collections/:collectionId/settings"
        element={<CatalogApp section="settings" />}
      />
    </Routes>
  );
}
