# Current State Review

## Overall Assessment

CurateDS is in a strong "working MVP plus expansion" state:

- the app has a real vertical slice across collections, items, reports, saved views, media, and mobile groundwork
- the repo structure is clearer than an early prototype and already shows meaningful separation between API, application, infrastructure, and web concerns
- the recent client shell work moved the web app closer to a real product layout instead of a single-page workbench

The main refactor need is no longer foundational architecture. It is now consistency and hardening:

- tighten state/query correctness in the web client
- reduce brittle client-side parsing paths
- align cross-screen behavior like drill-through and saved view restoration
- keep decomposing large feature surfaces into smaller reusable units
- improve test reliability where environment-specific failures are still present

## Strengths

- clear bounded layers in the backend
- relational model with real query evolution already underway
- meaningful web and API test coverage
- explicit API DTOs and stronger Problem Details standardization
- good local hosting and deployment story with Docker + Railway alignment

## Main Risks

- some item-filter state changes do not map cleanly to cache invalidation
- a few newer UI flows are functionally useful but still interaction-fragile
- report drill-through behavior is not fully symmetric with item-page filter intake
- some persistence-adjacent client parsing assumes data is always perfect
- infrastructure tests still have host-environment coupling

## Refactor Goal

The next refactor phase should focus on:

1. fixing correctness bugs in filter, saved view, and report navigation behavior
2. consolidating repeated client-side state and query-key logic
3. hardening UX components that are now core navigation or input controls
4. reducing environmental brittleness in validation and infrastructure tests
