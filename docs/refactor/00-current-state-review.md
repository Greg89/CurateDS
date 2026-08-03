# Current State Review

Status updated: 2026-06-29

## Overall Assessment

CurateDS is in a strong "working MVP plus expansion" state:

- the app has a real vertical slice across collections, items, reports, saved views, media, and mobile groundwork
- the repo structure is clearer than an early prototype and already shows meaningful separation between API, application, infrastructure, and web concerns
- the recent client shell work moved the web app closer to a real product layout instead of a single-page workbench
- the item-filter, saved-view, and report drill-through correctness fixes from the 2026-06-26 review are now in place
- the item form/detail drawers no longer stay mounted after close, and beta smoke testing confirmed the stuck Create Item popup regression is resolved

The main refactor need is no longer foundational architecture. It is now consistency, hardening, and cleanup:

- harden interactive controls that are now central to everyday use
- reduce brittle server-side validation gaps before more persistence-heavy features land
- keep docs and contributor-facing notes aligned with the actual repo state
- design transaction boundaries for multi-step writes before adding new domain entities
- improve test reliability where environment-specific failures are still present

## Strengths

- clear bounded layers in the backend
- relational model with real query evolution already underway
- meaningful web and API test coverage
- explicit API DTOs and stronger Problem Details standardization
- good local hosting and deployment story with Docker + Railway alignment
- canonical item-filter serialization is now shared by cache keys, saved views, and URL handoff

## Main Risks

- a few newer UI flows are functionally useful but still interaction-fragile
- server-side saved-view creation still accepts raw filter JSON
- multi-step write paths do not yet have explicit transaction boundaries
- repository docs and some UI copy still have visible encoding regressions
- infrastructure tests still have host-environment coupling

## Refactor Goal

The next refactor phase should focus on:

1. hardening UX components that are now core navigation or input controls
2. cleaning docs/status notes so planning follows the current repo, not stale findings
3. adding server-side validation for saved-view filter JSON
4. designing explicit transaction boundaries for multi-step writes
5. reducing environmental brittleness in validation and infrastructure tests
