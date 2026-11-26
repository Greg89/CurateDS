# CurateDS V2 Collection Workspace

## Workspace Model

The application has a small global shell and a collection-owned workspace.

```text
User
+- Collections
   +- Books
   +- Vinyl
   +- Board Games
```

After sign-in, a user creates a first collection or switches into an existing one. Once a collection is selected, the collection context remains visible throughout the experience.

## First-Run Flow

1. Sign in.
2. Create the first collection.
3. Choose a name and hobby/category.
4. Add an optional description, cover image, and visual identity.
5. Enter the collection overview.
6. Add the first item.

The first-run path should lead to a meaningful collection view quickly. Configuration should be progressive rather than a prerequisite for starting.

## Global Shell

The global shell should stay intentionally small:

- collection switcher
- account access
- current collection context
- access to collection creation

There is no organization administration area, member management, role system, or group-action surface.

## Collection Navigation

The collection workspace should provide a coherent set of destinations:

- **Overview** - the living summary of the collection
- **Browse** - search, filter, sort, and curate items
- **Insights** - reports and trends that make the collection enjoyable to explore
- **Showcase** - the presentation view of the collection
- **Settings** - collection identity, metadata, and collection controls

The exact labels may evolve, but the distinction between the collection experience and collection configuration should remain clear.

## Collection Header

Every collection-owned page should preserve a collection header or equivalent visual context containing:

- collection name
- cover or identity image where available
- short description or category
- useful item count or summary
- primary add-item action
- current section

A blank generic management page is not an acceptable default for a collection-owned route.

## Two Modes

### Curate Mode

Curate mode supports operational work:

- add and edit items
- organize tags and locations
- manage custom fields
- review history
- configure collection behavior

### Experience Mode

Experience mode supports discovery and expression:

- browse the collection visually
- explore insights and trends
- view featured items
- open the showcase
- share the collection when sharing is enabled

The modes may share data and navigation, but they should not feel like the same interface. Curate mode is efficient; experience mode is expressive.

## Presentation Direction

A collection showcase should eventually support:

- collection cover and description
- featured or pinned items
- configurable sections
- selected reports or summary cards
- visual templates
- private or shareable presentation routes

The showcase should be built from the same collection data as the workspace, not from a separate content model that drifts from the catalog.
