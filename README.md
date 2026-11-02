# atlas-shop

Back-office for the atlas-shop e-commerce platform: customer management, order handling,
catalog maintenance, support tickets and a KPI dashboard for the operations team.

## Layout

This repository is an npm-workspaces monorepo.

| Path          | What it is                                                         |
| ------------- | ------------------------------------------------------------------ |
| `apps/web`    | Angular 19 standalone application (the back-office UI)             |
| `apps/api`    | Node 22 HTTP API (TypeScript, hand-written router over `node:http`) |
| `libs/shared` | Domain models, money arithmetic, validation and pricing helpers    |
| `docs/`       | Architecture notes and changelog                                   |
| `scenarios/`  | Pull-request scenarios used to exercise the air-review bot         |

## Getting started

```bash
npm install
cp apps/api/.env.example apps/api/.env   # fill AUTH_TOKEN_SIGNING_KEY and PAYMENT_WEBHOOK_SECRET
npm run dev --workspace @atlas/api       # http://127.0.0.1:3333
npm start --workspace @atlas/web         # http://localhost:4200 (proxies /api)
npm test                                 # vitest, all workspaces
```

Local development users live in `apps/api/src/modules/auth/auth.repository.ts`
(`admin@atlas-shop.local`, `ops@atlas-shop.local`, `support@atlas-shop.local`).

## Conventions (short version)

The long version is in [docs/architecture.md](docs/architecture.md).

- **Container / presenter.** Every feature screen in `apps/web` is a `*.container.ts`
  (injects services and stores, owns state and navigation) paired with a `*.presenter.ts`
  (inputs and outputs only, never injects a service).
- **Subscriptions die with the component.** Any `subscribe(` inside a component goes through
  `.pipe(takeUntilDestroyed(this.destroyRef))`.
- **Signals for state, `inject()` for dependencies, `providedIn: 'root'` for services.**
- **i18n.** Every key exists in `en.json`, `fr.json` and `de.json`; keys are `feature.section.key`.
- **API layering.** controller → service → repository. DTOs are validated before they reach a
  service. Money is always an integer in minor units. Failures are `Result` values, not throws.
- **Tests** are `*.spec.ts` files next to the code they test (vitest).
- **No secrets in the repository.** Keys and shared secrets come from the environment.

## Pull requests

Every pull request targeting `main` on Azure DevOps is reviewed by **air-review** before a human
looks at it. The bot picks a review tier from the size and shape of the diff, runs the
deterministic rules (secrets, subscription lifecycle, container/presenter split, i18n parity),
asks a model for the rest, and votes on the PR. See `scenarios/README.md` for the scenarios we use
to check the bot's behaviour; the tool documents itself in its own repository.

## Versioning

See [docs/CHANGELOG.md](docs/CHANGELOG.md).
