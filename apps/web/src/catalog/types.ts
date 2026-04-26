import { ItemFilters } from "../api";

export type CatalogSection = "overview" | "items" | "settings";

export interface SavedItemView {
  id: string;
  name: string;
  filters: ItemFilters;
}

export interface UsageEntry {
  name: string;
  count: number;
  percentage: number;
}
