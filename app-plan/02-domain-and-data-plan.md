# Domain And Data Plan

## Domain Model

Stable core entities:

- AppUser
- Collection
- CollectionTemplate
- Item
- ItemType
- Tag
- ItemTag
- Location
- MediaAsset
- SavedView
- ItemEvent
- AttributeDefinition
- AttributeValue

## Key Domain Ideas

### Collection

Represents a hobby grouping owned by a user, such as board games, records, model kits, or fountain pens.

Suggested core fields:

- Id
- OwnerId
- Name
- Slug
- Description
- TemplateId
- CreatedUtc
- ArchivedUtc

### CollectionTemplate

Defines how a collection behaves without forcing a separate hard-coded schema per hobby.

Suggested fields:

- Id
- Name
- Description
- SupportsLocations
- SupportsTags
- SupportsMedia

Templates can ship with starter attribute definitions but should still be user-extensible.

### Item

Represents a single collectible or catalog entry.

Suggested core fields:

- Id
- CollectionId
- ItemTypeId
- Name
- Description
- Status
- Quantity
- AcquiredOn
- EstimatedValue
- LocationId
- CreatedUtc
- UpdatedUtc

### AttributeDefinition

Defines user- or template-configured metadata fields.

Suggested fields:

- Id
- CollectionId
- Name
- Key
- DataType
- IsRequired
- IsFilterable
- SortOrder

Supported data types should stay intentionally small at launch:

- text
- long text
- number
- decimal
- boolean
- date
- single select

### AttributeValue

Stores item-specific values tied to definitions.

Suggested fields:

- Id
- ItemId
- AttributeDefinitionId
- ValueText
- ValueNumber
- ValueDecimal
- ValueBoolean
- ValueDate

This keeps the model relational while allowing controlled flexibility.

## Relational Strategy

Stay relational by splitting the model into:

- strongly typed core tables for shared catalog concepts
- definition/value tables for configurable metadata

Avoid a generic JSON blob as the primary model. PostgreSQL `jsonb` can still be used sparingly for non-critical auxiliary data if needed later, but not as the main item schema.

## Aggregate Boundaries

Recommended aggregates:

- Collection aggregate
- Item aggregate
- SavedView aggregate

Collection controls:

- ownership
- template behavior
- attribute-definition lifecycle

Item controls:

- core item state
- attribute values
- tag membership rules
- location assignment
- event recording

## Important Invariants

- An item belongs to exactly one collection.
- Attribute values must belong to definitions from the same collection as the item.
- Attribute values must match the definition data type.
- Tags are scoped to a user or collection, not globally uncontrolled.
- A location assigned to an item must be valid for the same owner context.
- Soft delete or archive should be preferred over destructive removal for core catalog records.

## Initial ERD Direction

Use the existing `docs/08-erd-v1.md` list as the seed, then refine toward:

- one owner to many collections
- one collection to many items
- one collection to many attribute definitions
- one item to many attribute values
- many-to-many item/tag through `ItemTag`
- one item to many media assets
- one item to many item events

## API Surface v1

Recommended initial endpoints:

- `GET/POST /collections`
- `GET/PATCH /collections/{id}`
- `GET/POST /collections/{id}/attribute-definitions`
- `GET/POST /items`
- `GET /items/{id}`
- `POST /items/{id}/media`
- `POST /items/{id}/events`
- `GET/POST /tags`
- `GET/POST /locations`
- `GET /search`

Keep the first version narrow and task-oriented. Avoid building a generic everything-endpoint surface.
