// ---------------------------------------------------------------------------
// Public API surface — re-exported from feature modules
// ---------------------------------------------------------------------------

export { setTokenProvider } from "./http";

export type {
  Collection,
  CollectionSummary,
  ItemsByLocation,
  ItemsByTag,
  CollectionReports,
  CollectionActivityEvent,
  PagedCollectionActivity,
} from "./collections";
export {
  listCollections,
  createCollection,
  deleteCollection,
  getCollectionSummary,
  getCollectionReports,
  listCollectionActivity,
  downloadCollectionExport,
} from "./collections";

export type {
  AttributeDataType,
  AttributeDefinition,
} from "./attributes";
export {
  AttributeDataTypeSchema,
  listAttributeDefinitions,
  createAttributeDefinition,
  updateAttributeDefinition,
  deleteAttributeDefinition,
} from "./attributes";

export type {
  ItemSummary,
  PagedItems,
  ItemDetail,
  ItemAttributeValue,
  ItemEvent,
  ItemFilters,
} from "./items";
export {
  listItems,
  getItemDetail,
  listItemEvents,
  createItem,
  updateItem,
  deleteItem,
} from "./items";

export type { MediaAsset } from "./media";
export {
  uploadItemMedia,
  deleteItemMedia,
  setPrimaryItemMedia,
} from "./media";

export type { Tag } from "./tags";
export { listTags, createTag, updateTag, deleteTag } from "./tags";

export type { Location } from "./locations";
export { listLocations, createLocation, updateLocation, deleteLocation } from "./locations";

export type { ItemType } from "./item-types";
export { listItemTypes, createItemType, deleteItemType } from "./item-types";

export type { SavedView } from "./saved-views";
export { listSavedViews, createSavedView, deleteSavedView } from "./saved-views";
