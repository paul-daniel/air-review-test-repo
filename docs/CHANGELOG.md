# Changelog

All notable changes to atlas-shop are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versions follow semver.

## [Unreleased]

### Added

- Order returns: customers can return delivered lines within 30 days
  (`POST /api/returns`); support approves or rejects with a note, operations marks the goods
  as received (stock is put back through the catalog), administrators trigger the refund.
- Refund calculation in `@atlas/shared/pricing`: returned units at the paid price minus the
  pro-rata line discount, 10 % restocking fee except for damaged / wrong / not-as-described
  items, shipping refunded on full returns.
- Back-office "Returns" screen (queue with role-gated actions) and "Request a return" entry
  point on delivered orders; `returns.*` strings in en / fr / de.

## [1.4.0] - 2026-04-28

### Added

- Support module: tickets with status workflow, priority queue and open-backlog KPI.
- Dashboard KPIs refresh every minute and link to the filtered order list.
- Product stock adjustments with audit reason (`POST /api/products/:id/stock`).

### Changed

- Orders now reserve stock atomically when they are placed; a shortfall rejects the whole order.
- Promo codes are validated against expiry and minimum subtotal in the pricing service.

### Fixed

- Customers with at least one non-cancelled order can no longer be deleted.

## [1.3.0] - 2026-03-12

### Added

- Customer tiers (standard, silver, gold, platinum) with per-line tier discounts.
- German dictionary (`de.json`); French and German are now feature-complete with English.

### Changed

- Web app migrated to Angular 19 standalone components and zoneless change detection.
- All feature screens split into container and presenter components.

## [1.2.0] - 2026-02-05

### Added

- Order status state machine with history endpoint.
- Money formatting pipe that follows the active locale.

## [1.1.0] - 2026-01-15

### Added

- Catalog module with variants and inactive products.

## [1.0.0] - 2025-12-01

Initial back-office release: customers, orders, authentication.
