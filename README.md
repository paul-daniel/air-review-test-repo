# atlas-shop

Back-office for the atlas-shop e-commerce platform: customer management, order handling,
catalog maintenance and a KPI dashboard for the operations team.

This repository is an npm-workspaces monorepo:

| Path           | What it is                                                       |
| -------------- | ---------------------------------------------------------------- |
| `apps/web`     | Angular 19 standalone application (back-office UI)               |
| `apps/api`     | Node 22 HTTP API (TypeScript, hand-written router over node:http) |
| `libs/shared`  | Domain models, money arithmetic, validation and pricing helpers   |
| `docs/`        | Architecture notes and changelog                                  |
| `scenarios/`   | Test scenarios for the air-review pull-request reviewer           |

See [docs/architecture.md](docs/architecture.md) for module boundaries and conventions.
