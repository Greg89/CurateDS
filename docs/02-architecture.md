# Architecture

One repo. Separate API and web app. V2 keeps the active product surface limited to backend services and the browser experience.

The .NET API remains the source of truth for collection ownership, domain rules, validation, persistence, media, and reports. The web app is the primary collection experience and is planned to move from Vite to Next.js so authenticated workspace routes and public collection showcase routes can share a coherent web foundation.

See [V2 Language And Architecture](14-v2-language-and-architecture.md) for the client boundary and migration strategy.
