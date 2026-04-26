import { FormEvent, useState } from "react";
import {
  AttributeDataType,
  AttributeDefinition,
  Collection,
  ItemSummary,
  Location,
  Tag
} from "../../api";
import { AttributeDefinitionList } from "../components/AttributeDefinitionList";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { OrganizationSummary } from "../components/OrganizationSummary";

const attributeDataTypes: AttributeDataType[] = [
  "Text",
  "Number",
  "Decimal",
  "Boolean",
  "Date",
  "SingleSelect"
];

export function SettingsPage({
  attributeDataType,
  attributeDefinitions,
  attributeIsFilterable,
  attributeIsRequired,
  attributeName,
  createAttributeDefinitionError,
  createLocationError,
  createTagError,
  isCreateAttributePending,
  isCreateLocationPending,
  isCreateTagPending,
  items,
  locationDescription,
  locationName,
  locations,
  selectedCollection,
  tagName,
  tags,
  onAttributeDataTypeChange,
  onAttributeIsFilterableChange,
  onAttributeIsRequiredChange,
  onAttributeNameChange,
  onAttributeSubmit,
  onLocationDescriptionChange,
  onLocationNameChange,
  onLocationSubmit,
  onTagNameChange,
  onTagSubmit,
  isDeleteCollectionPending,
  onDeleteCollection,
  isDeleteAttributeDefinitionPending,
  onDeleteAttributeDefinition,
  isDeleteTagPending,
  onDeleteTag,
  isDeleteLocationPending,
  onDeleteLocation
}: Readonly<{
  attributeDataType: AttributeDataType;
  attributeDefinitions: AttributeDefinition[];
  attributeIsFilterable: boolean;
  attributeIsRequired: boolean;
  attributeName: string;
  createAttributeDefinitionError: string | null;
  createLocationError: string | null;
  createTagError: string | null;
  isCreateAttributePending: boolean;
  isCreateLocationPending: boolean;
  isCreateTagPending: boolean;
  items: ItemSummary[];
  locationDescription: string;
  locationName: string;
  locations: Location[];
  selectedCollection: Collection;
  tagName: string;
  tags: Tag[];
  onAttributeDataTypeChange: (value: AttributeDataType) => void;
  onAttributeIsFilterableChange: (value: boolean) => void;
  onAttributeIsRequiredChange: (value: boolean) => void;
  onAttributeNameChange: (value: string) => void;
  onAttributeSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onLocationDescriptionChange: (value: string) => void;
  onLocationNameChange: (value: string) => void;
  onLocationSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTagNameChange: (value: string) => void;
  onTagSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isDeleteCollectionPending: boolean;
  onDeleteCollection: () => void;
  isDeleteAttributeDefinitionPending: boolean;
  onDeleteAttributeDefinition: (id: string) => void;
  isDeleteTagPending: boolean;
  onDeleteTag: (id: string) => void;
  isDeleteLocationPending: boolean;
  onDeleteLocation: (id: string) => void;
}>) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  return (
    <section className="content-grid">
      <section className="panel">
        <div className="panel-header">
          <h3>Attribute Definitions</h3>
          <p>Define reusable item fields for {selectedCollection.name}.</p>
        </div>

        <form className="collection-form" onSubmit={onAttributeSubmit}>
          <label className="field">
            <span>Name</span>
            <input
              value={attributeName}
              onChange={(event) => onAttributeNameChange(event.target.value)}
              placeholder="Release Year"
              maxLength={60}
            />
          </label>

          <label className="field">
            <span>Data Type</span>
            <select
              value={attributeDataType}
              onChange={(event) =>
                onAttributeDataTypeChange(event.target.value as AttributeDataType)
              }
            >
              {attributeDataTypes.map((dataType) => (
                <option key={dataType} value={dataType}>
                  {dataType}
                </option>
              ))}
            </select>
          </label>

          <label className="checkbox-row">
            <input
              checked={attributeIsRequired}
              onChange={(event) => onAttributeIsRequiredChange(event.target.checked)}
              type="checkbox"
            />
            <span>Required for future items</span>
          </label>

          <label className="checkbox-row">
            <input
              checked={attributeIsFilterable}
              onChange={(event) => onAttributeIsFilterableChange(event.target.checked)}
              type="checkbox"
            />
            <span>Filterable in list views</span>
          </label>

          <button className="primary-button" disabled={isCreateAttributePending} type="submit">
            {isCreateAttributePending ? "Saving..." : "Add Attribute"}
          </button>

          {createAttributeDefinitionError ? (
            <p className="message error">{createAttributeDefinitionError}</p>
          ) : null}
        </form>

        <AttributeDefinitionList
          attributeDefinitions={attributeDefinitions}
          selectedCollectionName={selectedCollection.name}
          isDeletePending={isDeleteAttributeDefinitionPending}
          onDelete={onDeleteAttributeDefinition}
        />
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Organization</h3>
          <p>Create reusable tags and storage locations for your items.</p>
        </div>

        <form className="collection-form" onSubmit={onTagSubmit}>
          <label className="field">
            <span>Tag Name</span>
            <input
              value={tagName}
              onChange={(event) => onTagNameChange(event.target.value)}
              placeholder="Wishlist"
              maxLength={50}
            />
          </label>

          <button className="primary-button" disabled={isCreateTagPending} type="submit">
            {isCreateTagPending ? "Saving..." : "Add Tag"}
          </button>

          {createTagError ? <p className="message error">{createTagError}</p> : null}
        </form>

        <form className="collection-form section-gap" onSubmit={onLocationSubmit}>
          <label className="field">
            <span>Location Name</span>
            <input
              value={locationName}
              onChange={(event) => onLocationNameChange(event.target.value)}
              placeholder="Office Shelf"
              maxLength={80}
            />
          </label>

          <label className="field">
            <span>Description</span>
            <input
              value={locationDescription}
              onChange={(event) => onLocationDescriptionChange(event.target.value)}
              placeholder="Upper left bookcase"
              maxLength={240}
            />
          </label>

          <button className="primary-button" disabled={isCreateLocationPending} type="submit">
            {isCreateLocationPending ? "Saving..." : "Add Location"}
          </button>

          {createLocationError ? <p className="message error">{createLocationError}</p> : null}
        </form>

        <OrganizationSummary
          items={items}
          locations={locations}
          tags={tags}
          isDeleteTagPending={isDeleteTagPending}
          isDeleteLocationPending={isDeleteLocationPending}
          onDeleteTag={onDeleteTag}
          onDeleteLocation={onDeleteLocation}
        />
      </section>

      <section className="panel panel-danger">
        <div className="panel-header">
          <h3>Danger Zone</h3>
          <p>Permanently remove this collection and all its data.</p>
        </div>
        <button
          className="danger-button"
          onClick={() => setShowDeleteConfirm(true)}
        >
          Delete Collection
        </button>
      </section>

      {showDeleteConfirm ? (
        <ConfirmDialog
          title={`Delete "${selectedCollection.name}"?`}
          message="This will permanently delete the collection, all its items, attribute definitions, and associated data. This action cannot be undone."
          isPending={isDeleteCollectionPending}
          onConfirm={onDeleteCollection}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      ) : null}
    </section>
  );
}
