# atlas-shop architecture

## Modules

```
libs/shared          pure TypeScript, no framework imports
  models/            Money, Customer, Product, Order, OrderLine, OrderStatus
  money.ts           add / subtract / multiply / allocate / format (minor units)
  validation.ts      field validators returning FieldError lists
  pricing/           applyPercentDiscount, tax helpers
  dates.ts, ids.ts   small utilities used on both sides

apps/api             Node 22, node:http, no framework
  lib/               Result type, logger, router, http helpers
  middleware/        error, logging, auth (bearer tokens), requireRole
  modules/<name>/    controller · service · repository · dto · validation · spec

apps/web             Angular 19, standalone, zoneless
  core/              auth, api client, interceptors, guards, notifications, i18n
  shared/            ui components, pipes, directives, utils
  features/<name>/   container · presenter (+ html) · service · store · routes · models · spec
```

Dependency direction is strict: `apps/*` depend on `libs/shared`; `libs/shared` depends on
nothing; `apps/web` and `apps/api` never import each other. Shapes that cross the wire are
declared as DTOs on the API side and as `*.models.ts` on the web side; when the shape is a plain
domain type it is re-exported from `@atlas/shared` instead of being duplicated.

## Container / presenter convention (web)

Each feature screen is two components:

| File                     | Responsibilities                                                                 |
| ------------------------ | -------------------------------------------------------------------------------- |
| `<name>.container.ts`    | `inject()`s services, stores, router and route. Owns signals. Handles navigation and notifications. Template is only the presenter tag. |
| `<name>.presenter.ts`    | `input()` / `output()` only. Owns reactive forms and purely local UI state (dialog open, hover). Never injects a service. Template in `<name>.presenter.html`. |

Why: presenters can be rendered in isolation (stories, tests) with plain values, containers can
be unit-tested with mocked services, and the data flow is visible in the container's template.

A one-off component that mixes both responsibilities is a convention violation and is flagged
by air-review (`angular.container-presenter`). If something does not fit the split, it belongs in
`shared/ui` as a dumb component or in `core` as a service.

## Subscription lifecycle (web)

Containers subscribe to router observables, store streams and HTTP calls. Every `subscribe(`
inside a component must be scoped to the component's lifetime:

```ts
private readonly destroyRef = inject(DestroyRef);

this.route.paramMap
  .pipe(map(...), takeUntilDestroyed(this.destroyRef))
  .subscribe(...);
```

`takeUntilDestroyed` comes from `@angular/core/rxjs-interop`. `async` pipe and `toSignal` are
preferred when the value is only rendered; explicit subscriptions are for side effects.

## State

- Feature stores are `@Injectable({ providedIn: 'root' })` classes built on signals
  (`apps/web/src/app/features/orders/orders.store.ts` is the reference implementation).
- Stores expose read-only signals and `async` methods; they never expose their `signal()`s
  directly and they never call the router or show notifications (containers do).
- Components use `ChangeDetectionStrategy.OnPush` and the app runs zoneless.

## i18n

- Dictionaries live in `apps/web/src/assets/i18n/{en,fr,de}.json` and are nested by feature:
  `orders.detail.totals.subtotal`.
- The three files must have exactly the same key set; `en.json` is the source of truth.
  A key that is not yet translated is copied verbatim from English (never omitted), so the
  app never shows raw keys. air-review checks key parity on every PR.
- Interpolation uses `{{name}}`; parameters are passed as an object to the `translate` pipe.
- No user-visible string is hard-coded in a template or a component.

## API layering

```
HTTP request
  → middleware chain (error → logging → auth → route guards)
  → controller   : parses query/params, runs DTO validation, maps Result → HttpResponse
  → service      : business rules, state machine, cross-module calls through interfaces
  → repository   : in-memory Map today, a database tomorrow; no business logic
```

Rules:

- A controller never touches a repository; a service never reads `HttpContext`.
- DTO validation (`*.validation.ts`) runs in the controller before the service is called and
  returns the full list of field errors (HTTP 422).
- Services return `Result<T, AppError>` (`apps/api/src/lib/result.ts`). Throwing is reserved for
  programmer errors; the error middleware turns those into a 500 without leaking details.
- Money is an integer number of minor units everywhere. Percentages are human percentages
  (`10` means 10 %) and are converted exactly once, inside `libs/shared/src/pricing`.
- Pricing order of operations: tier discount per line → promo code on the subtotal → shipping →
  tax on (net + shipping).
- Cross-module dependencies go through small interfaces (`StockReserver`, `CustomerOrderStats`)
  that are wired in `apps/api/src/app.ts`, the only composition root.

## Configuration and secrets

`apps/api/src/config.ts` reads everything from the environment. Signing keys and webhook secrets
are required at start-up and never have a default; `.env.example` lists the variable names with
empty values. Committing a literal secret fails the air-review `security.secret-in-code` rule.

## Testing

- `*.spec.ts` next to the code, run by vitest (`npm test` at the root runs every workspace).
- Shared lib and API specs are plain node tests; web specs use jsdom and `TestBed` with mocked
  services. Presenters are tested through their container or directly with inputs set via
  `fixture.componentRef.setInput`.
