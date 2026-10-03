"use client";
import Link from "next/link";
import { SavedViews } from "./saved-views";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useCollection } from "./collection-context";
import { ItemFailure, ItemImage } from "./item-shared";
import {
  browseParams,
  fetchOptions,
  itemListSchema,
  itemsKey,
  optionsKey,
  readJson,
} from "@/lib/items";
import { CollectionsError } from "@/lib/collections";

export function ItemBrowse() {
  const collection = useCollection();
  const router = useRouter();
  const search = useSearchParams();
  const raw = search.toString();
  const extraKeys = [
    "createdAfter",
    "createdBefore",
    "createdBeforeExclusive",
    "exactAttributeKey",
    "exactAttributeValue",
    "minQuantity",
    "maxQuantity",
    "attributeFilters",
  ];
  let params: URLSearchParams;
  let invalid = false;
  try {
    params = browseParams(new URLSearchParams(raw));
  } catch {
    params = browseParams(new URLSearchParams());
    invalid = true;
  }
  const queryString = params.toString();
  const path = `/collections/${collection.id}/browse`;
  const list = search.get("view") === "list";
  const options = useQuery({
    queryKey: optionsKey(collection.id),
    queryFn: ({ signal }) => fetchOptions(collection.id, signal),
  });
  const query = useQuery({
    queryKey: [...itemsKey(collection.id), queryString],
    enabled: !invalid,
    queryFn: async ({ signal }) => {
      const data = await readJson(
        `/api/collections/${collection.id}/items?${queryString}`,
        itemListSchema,
        signal,
      );
      if (data.items.some((item) => item.collectionId !== collection.id))
        throw new CollectionsError(502);
      return data;
    },
  });
  function href(change: Record<string, string>) {
    const next = new URLSearchParams(raw);
    for (const [key, value] of Object.entries(change)) next.set(key, value);
    return `${path}?${next}`;
  }
  return (
    <section data-color={collection.color || "forest"}>
      <header className="collection-heading">
        <span className="eyebrow">
          {collection.category || "Your collection"} / Browse
        </span>
        <h1>{collection.name}</h1>
        <p>
          {collection.description ||
            "Find an old favourite. Make room for a new one."}
        </p>
        <Link
          className="button"
          href={`/collections/${collection.id}/items/new`}
        >
          Add an item
        </Link>
      </header>
      {extraKeys.some((key) => search.has(key)) && (
        <section
          className="inherited-filters"
          aria-label="Filters from your view"
        >
          <h2>A closer look</h2>
          {search.has("exactAttributeKey") && (
            <p>
              {options.data?.definitions.find(
                (d) => d.key === search.get("exactAttributeKey"),
              )?.name || search.get("exactAttributeKey")}{" "}
              equals {search.get("exactAttributeValue")}
            </p>
          )}
          {search.has("createdAfter") && (
            <p>
              Added on or after {search.get("createdAfter")?.slice(0, 10)} (UTC)
            </p>
          )}
          {search.has("createdBeforeExclusive") && (
            <p>
              Added before {search.get("createdBeforeExclusive")?.slice(0, 10)}{" "}
              (UTC)
            </p>
          )}
          {search.has("createdBefore") && (
            <p>Added on or before {search.get("createdBefore")} (UTC)</p>
          )}
          {(search.has("minQuantity") || search.has("maxQuantity")) && (
            <p>
              Quantity: {search.get("minQuantity") || "1"} to{" "}
              {search.get("maxQuantity") || "any"}
            </p>
          )}
          {search.getAll("attributeFilters").map((value) => (
            <p key={value}>Custom field contains: {value}</p>
          ))}
          <Link className="text-button" href={path}>
            Clear all filters
          </Link>
        </section>
      )}
      <form
        key={raw}
        className="browse-controls"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const next = new URLSearchParams();
          for (const [key, value] of form.entries())
            if (typeof value === "string" && value) next.append(key, value);
          next.set("page", "1");
          if (list) next.set("view", "list");
          router.push(`${path}?${next}`, { scroll: false });
        }}
      >
        {extraKeys.flatMap((key) =>
          search
            .getAll(key)
            .map((value, index) => (
              <input key={key + index} type="hidden" name={key} value={value} />
            )),
        )}
        <label className="search-field">
          Search your collection
          <input
            name="searchText"
            type="search"
            maxLength={200}
            defaultValue={search.get("searchText") || ""}
            placeholder="Name or description"
          />
        </label>
        <details>
          <summary>Filters and sorting</summary>
          <div className="filter-fields">
            <label>
              Location
              <select
                key={options.data ? "locations-ready" : "locations-pending"}
                disabled={options.isPending}
                name="locationId"
                defaultValue={search.get("locationId") || ""}
              >
                <option value="">All locations</option>
                {options.data?.locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Item type
              <select
                key={options.data ? "types-ready" : "types-pending"}
                disabled={options.isPending}
                name="itemTypeId"
                defaultValue={search.get("itemTypeId") || ""}
              >
                <option value="">All types</option>
                {options.data?.types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sort by
              <select
                name="sortBy"
                defaultValue={search.get("sortBy") || "createdUtc"}
              >
                <option value="createdUtc">Date added</option>
                <option value="updatedUtc">Last updated</option>
                <option value="name">Name</option>
                <option value="quantity">Quantity</option>
              </select>
            </label>
            <label>
              Order
              <select
                name="sortDirection"
                defaultValue={search.get("sortDirection") || "desc"}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </label>
            <label>
              Items per page
              <select
                name="pageSize"
                defaultValue={search.get("pageSize") || "12"}
              >
                <option value="12">12</option>
                <option value="24">24</option>
                <option value="48">48</option>
              </select>
            </label>
            <label>
              Tag matching
              <select
                name="tagMatchMode"
                defaultValue={search.get("tagMatchMode") || "all"}
              >
                <option value="all">All selected tags</option>
                <option value="any">Any selected tag</option>
              </select>
            </label>
          </div>
          <fieldset className="check-options">
            <legend>Tags</legend>
            {options.data?.tags.length === 0 && <p>No tags yet.</p>}
            {options.data?.tags.map((tag) => (
              <label key={tag.id}>
                <input
                  type="checkbox"
                  name="tagIds"
                  value={tag.id}
                  defaultChecked={search.getAll("tagIds").includes(tag.id)}
                />
                {tag.name}
              </label>
            ))}
          </fieldset>
          <div className="check-options">
            <label>
              <input
                type="checkbox"
                name="hasNoItemType"
                value="true"
                defaultChecked={search.get("hasNoItemType") === "true"}
              />
              Without an item type
            </label>
            <label>
              <input
                type="checkbox"
                name="hasNoLocation"
                value="true"
                defaultChecked={search.get("hasNoLocation") === "true"}
              />
              Without a location
            </label>
            <label>
              <input
                type="checkbox"
                name="hasNoTags"
                value="true"
                defaultChecked={search.get("hasNoTags") === "true"}
              />
              Without tags
            </label>
          </div>
          {options.isPending && <p role="status">Loading filter choices…</p>}
          {options.isError && (
            <div role="alert">
              Filter choices couldn't be loaded.{" "}
              <button type="button" onClick={() => void options.refetch()}>
                Retry choices
              </button>
            </div>
          )}
        </details>
        <div className="form-actions">
          <button
            className="button"
            disabled={options.isPending || options.isError}
          >
            Apply filters
          </button>
          <Link href={path} className="text-button">
            Reset
          </Link>
        </div>
      </form>
      <div className="browse-result-heading">
        <p role="status">
          {query.data
            ? `${query.data.totalCount} ${query.data.totalCount === 1 ? "item" : "items"}`
            : query.isFetching
              ? "Finding your items…"
              : ""}
        </p>
        <div aria-label="Item presentation" className="view-toggle">
          <button
            aria-pressed={!list}
            onClick={() =>
              router.push(href({ view: "grid" }), { scroll: false })
            }
          >
            Grid
          </button>
          <button
            aria-pressed={list}
            onClick={() =>
              router.push(href({ view: "list" }), { scroll: false })
            }
          >
            List
          </button>
        </div>
      </div>
      {invalid ? (
        <section role="alert" className="workspace-note">
          <h2>These filters aren't valid.</h2>
          <Link href={path}>Reset filters</Link>
        </section>
      ) : query.isError ? (
        <ItemFailure
          error={query.error}
          retry={() => void query.refetch()}
          collectionId={collection.id}
        />
      ) : query.isPending ? (
        <p role="status">Opening the collection…</p>
      ) : query.data.items.length === 0 ? (
        <section className="workspace-note">
          <h2>No items in this view.</h2>
          <p>Try another search or reset your filters.</p>
          <Link href={path}>Reset filters</Link> ·{" "}
          <Link href={`/collections/${collection.id}/items/new`}>
            Add an item
          </Link>
        </section>
      ) : (
        <ul className={`browse-items ${list ? "list" : "grid"}`}>
          {query.data.items.map((item) => (
            <li key={item.id}>
              <Link href={`/collections/${collection.id}/items/${item.id}`}>
                <ItemImage
                  key={item.primaryImageUrl}
                  url={item.primaryImageUrl}
                  name={item.name}
                />
                <div className="item-card-copy">
                  <h2>{item.name}</h2>
                  <p>{item.description || "A part of your collection."}</p>
                  <span>
                    {item.quantity} {item.quantity === 1 ? "piece" : "pieces"}
                    {item.locationName ? ` · ${item.locationName}` : ""}
                  </span>
                  {item.tags.length > 0 && (
                    <p className="tag-line">{item.tags.join(" · ")}</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {query.data && query.data.totalPages > 1 && (
        <nav className="pagination" aria-label="Item pages">
          {Number(params.get("page")) > 1 && (
            <Link href={href({ page: String(Number(params.get("page")) - 1) })}>
              ← Previous
            </Link>
          )}
          <span>
            Page {params.get("page")} of {query.data.totalPages}
          </span>
          {Number(params.get("page")) < query.data.totalPages && (
            <Link href={href({ page: String(Number(params.get("page")) + 1) })}>
              Next →
            </Link>
          )}
        </nav>
      )}
      {query.data &&
        Number(params.get("page")) > Math.max(1, query.data.totalPages) && (
          <Link href={href({ page: "1" })}>Return to the first page</Link>
        )}
      {!invalid && (
        <SavedViews
          key={collection.id}
          collectionId={collection.id}
          search={raw}
        />
      )}
    </section>
  );
}
