# Changelog

All notable changes to atlas-shop are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versions follow semver.

## [Unreleased]

### Added

- Promotions: managed campaign codes (percentage, fixed amount, free shipping) with tiers,
  dates and usage limits; API module with preview endpoint; web list and editor; promo code
  preview in the order editor; live-promotions KPI on the dashboard.

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
