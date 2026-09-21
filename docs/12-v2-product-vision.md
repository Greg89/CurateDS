# CurateDS V2 Product Vision

## North Star

CurateDS helps hobbyists turn the things they collect into organized, expressive collections they enjoy managing and showing to others.

CurateDS is not primarily an inventory system. It is a collection-making and collection-sharing tool.

## Product Unit

The collection is the product unit, not the item.

A signed-in user owns one or more collections. Each collection is a complete personal workspace with its own:

- name, description, cover image, and visual identity
- items and media
- custom attributes and item types
- tags and locations
- saved views and reports
- activity and acquisition history
- presentation or showcase configuration

The product is single-user and collection-based. It does not include organization membership, group actions, roles, or collaborative editing in V2.

## Core Experience

The primary loop is:

1. Create a collection.
2. Establish its identity.
3. Add and curate items.
4. Browse and organize the collection.
5. Discover useful and enjoyable insights.
6. Present the collection as something worth sharing.

The product should make the collection visible and meaningful on every page. Users should feel that they are spending time with their collection, not administering a database.

## Product Pillars

### Curate Easily

Adding, editing, organizing, and enriching items should be fast and forgiving. Flexible metadata should support any hobby without making every user configure a schema before they can begin.

### Make It Yours

A collection should have its own vocabulary, theme, featured items, views, and presentation style. Customization should change how a collection speaks without forcing users to design an application.

### Enjoy The Collection

Reports and summaries should reveal satisfying patterns: growth, categories, favorites, locations, acquisition history, gaps, and other useful views of the user's collection.

### Express And Display

Splash pages and templates should let a hobbyist say, "This is my collection." Presentation is a core product outcome, not a marketing page added later.

## V2 Boundaries

V2 focuses on the API and web experience. Additional client apps are out of scope until the web product proves a clear need for them.

The existing .NET backend remains the initial foundation. The web experience is rebuilt around the collection workspace and may migrate from Vite to Next.js to support authenticated application routes and public presentation routes.

## Success Test

For any new screen, ask:

> If the page title disappeared, would I still know which collection I am looking at and why this page matters to it?

If the answer is no, the screen is probably too generic or too chore-oriented.
