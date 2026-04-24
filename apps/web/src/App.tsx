import { Navigate, Route, Routes } from "react-router-dom";
import { CatalogApp } from "./catalog/CatalogApp";

export function App() {
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
