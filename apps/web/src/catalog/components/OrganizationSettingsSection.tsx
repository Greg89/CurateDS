import { FormEvent, useState } from "react";
import { ItemSummary, Location, Tag } from "../../api";
import { OrganizationSummary } from "./OrganizationSummary";

export function OrganizationSettingsSection({
  createLocationError,
  createTagError,
  isCreateLocationPending,
  isCreateTagPending,
  isDeleteLocationPending,
  isDeleteTagPending,
  items,
  locations,
  tags,
  onCreateLocation,
  onCreateTag,
  onDeleteLocation,
  onDeleteTag
}: Readonly<{
  createLocationError: Error | null;
  createTagError: Error | null;
  isCreateLocationPending: boolean;
  isCreateTagPending: boolean;
  isDeleteLocationPending: boolean;
  isDeleteTagPending: boolean;
  items: ItemSummary[];
  locations: Location[];
  tags: Tag[];
  onCreateLocation: (input: { name: string; description: string; onSuccess: () => void }) => void;
  onCreateTag: (input: { name: string; onSuccess: () => void }) => void;
  onDeleteLocation: (locationId: string) => void;
  onDeleteTag: (tagId: string) => void;
}>) {
  const [tagName, setTagName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationDescription, setLocationDescription] = useState("");

  function handleTagSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreateTag({
      name: tagName,
      onSuccess: () => setTagName("")
    });
  }

  function handleLocationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreateLocation({
      name: locationName,
      description: locationDescription,
      onSuccess: () => {
        setLocationName("");
        setLocationDescription("");
      }
    });
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h3>Organization</h3>
        <p>Create reusable tags and storage locations for your items.</p>
      </div>

      <form className="collection-form" onSubmit={handleTagSubmit}>
        <label className="field">
          <span>Tag Name</span>
          <input
            value={tagName}
            onChange={(event) => setTagName(event.target.value)}
            placeholder="Wishlist"
            maxLength={50}
          />
        </label>

        <button className="primary-button" disabled={isCreateTagPending} type="submit">
          {isCreateTagPending ? "Saving..." : "Add Tag"}
        </button>

        {createTagError ? <p className="message error">{createTagError.message}</p> : null}
      </form>

      <form className="collection-form section-gap" onSubmit={handleLocationSubmit}>
        <label className="field">
          <span>Location Name</span>
          <input
            value={locationName}
            onChange={(event) => setLocationName(event.target.value)}
            placeholder="Office Shelf"
            maxLength={80}
          />
        </label>

        <label className="field">
          <span>Description</span>
          <input
            value={locationDescription}
            onChange={(event) => setLocationDescription(event.target.value)}
            placeholder="Upper left bookcase"
            maxLength={240}
          />
        </label>

        <button className="primary-button" disabled={isCreateLocationPending} type="submit">
          {isCreateLocationPending ? "Saving..." : "Add Location"}
        </button>

        {createLocationError ? <p className="message error">{createLocationError.message}</p> : null}
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
  );
}
