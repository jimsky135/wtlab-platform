# WTLab Deployment

## Production setup

| | |
|---|---|
| Hosting | Cloudflare Pages |
| Repository | `wtlab-platform` (GitHub) |
| Production branch | `main` |
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | repository root |
| Environment variables | `NODE_VERSION=24.18.0` (build only — matches the locally validated runtime; `package.json` engines requires ≥22.12.0). No other env vars: the app reads none. |
| Production domain | `https://www.wtlab.co` |
| Apex `wtlab.co` | 301 redirect → `https://www.wtlab.co` (zone Redirect Rule) |
| `phoenix.wtlab.co` | Project Phoenix — separate deployment, **never touched by this project** |

The site is fully static (ADR-0001): no SSR, no functions, no backend, no database, no cookies/localStorage. All instrument calculation and CSV import/export run in the visitor's browser. The only external requests are Google Fonts.

This describes the **Pages surface**, which serves every normal frontend page on `www.wtlab.co`. The one exception is `www.wtlab.co/api/guest/*`, routed since 2026-09-10 to the Guest Workspace Worker (ADR-0004) — see [Prototype resources](#prototype-resources--live-path-routed-in-production).

## Deployment workflow

```
Local development
→ node --test (all *.test.ts) · npx astro check · npx tsc --noEmit · npm run build
→ commit (after review/approval)
→ push main
→ Cloudflare Pages builds and deploys automatically
→ production smoke check (see checklist below)
```

Rules:

- **Never manually copy build files to production.** Git-based deployment is the only path; `dist/` is gitignored and rebuilt by Cloudflare on every push.
- Every push to `main` deploys to production — push only validated, approved work (existing sprint discipline).
- Non-`main` branches get Pages preview deployments automatically; they never affect production.

## Rollback principle

Rollback = redeploy a previous good commit. Two options:

1. **Dashboard**: Cloudflare Pages → Deployments → select the previous good deployment → "Rollback to this deployment" (instant, no git change).
2. **Git**: `git revert` the offending commit(s) on `main` and push — Pages redeploys. Prefer revert over force-push; never rewrite `main` history.

## Domain boundary

- `www.wtlab.co` — this project (Pages custom domain), except `www.wtlab.co/api/guest/*`, which a Worker route sends to `wtlab-guest-workspace-prototype`.
- `wtlab.co` — redirect only, via a zone-level Redirect Rule; carries no content.
- `phoenix.wtlab.co` — belongs to Project Phoenix. No DNS record, Pages project, or rule of Phoenix may be modified when operating on this project.

## Prototype resources — live, path-routed in production

The Guest Workspace Foundation (ADR-0004, commit `e47a8c7`) created **real
Cloudflare resources that are still running**. They remain a prototype (one
shared demo credential, no member model), but since **2026-09-10** the Worker
also answers one production path: `www.wtlab.co/api/guest/*`.

Current reality as of **2026-09-10**, split into three surfaces.

### A. Pages — `www.wtlab.co` frontend

| | |
|---|---|
| `main` | `00f4fd6` (frontend code unchanged since `70cb437`) |
| Frontend | Every normal page on `www.wtlab.co` is served by Cloudflare Pages |
| `/api/guest/*` | **Not served by Pages** — routed to the Guest Workspace Worker (B) |
| Guest login | **Functional on `www.wtlab.co`** |

Every other unmatched path — including non-guest `/api/*` such as `/api/db` —
still reaches Pages and gets its unknown-route fallback (200 + homepage HTML);
see the Pages fallback HOLD entry in [engineering.md](engineering.md).

Historical (before the route was activated on 2026-09-10): `GET
/api/guest/session` returned that fallback HTML, `POST /api/guest/login` a
Pages-side 405, and the login panel reported login unavailable.

### B. Guest Workspace Worker

| | |
|---|---|
| Worker | `wtlab-guest-workspace-prototype` |
| Current version | `a7b41c83-3eb0-4440-8ed1-6a1c83d47db5` (deployed 2026-09-11 from `main` @ `00f4fd6`; previous `3190914d`) |
| URL | https://wtlab-guest-workspace-prototype.jimchiu0627.workers.dev |
| D1 database | `wtlab-guest-workspace` (APAC). Migration `0001` applied |
| Bindings | `DB`, `ASSETS` |
| Route | `www.wtlab.co/api/guest/*` (zone `wtlab.co`) — activated 2026-09-10, persisted in `wrangler.jsonc` |
| Triggers | `workers.dev` + the route above — **no custom domain, no cron** |

Why the Worker is not named `wtlab-platform`: that name belongs to the Pages
project serving `www.wtlab.co`. The prototype keeps a distinct name so it can
never collide with production.

### C. Prototype Login

| Method | Route | |
|---|---|---|
| `GET` | `/api/guest/workspace` | List the caller's own datasets |
| `PUT` | `/api/guest/workspace` | Write (upsert) one dataset |
| `DELETE` | `/api/guest/workspace` | Clear the caller's own datasets |
| `GET` | `/api/guest/session` | `{ authenticated, loginAvailable }` |
| `POST` | `/api/guest/login` | Prototype login (`guest / guest`) |
| `POST` | `/api/guest/logout` | End the session and clear that owner's rows |

Workspace writes are **`PUT`**. `POST /api/guest/workspace` returns **405 by
design**. Any other `/api/guest/*` path gets the Worker's explicit JSON 404
`NOT_FOUND` (on the `workers.dev` URL, so does every other `/api/*` path).

Login config — Worker secrets, **names only**. Values exist only in Cloudflare
and in the gitignored local `.dev.vars`, never in the repository:

| Secret | Status |
|---|---|
| `PROTOTYPE_LOGIN_USERNAME` | configured on the prototype Worker |
| `PROTOTYPE_LOGIN_PASSWORD_SHA256` | configured on the prototype Worker |
| `PROTOTYPE_SESSION_SECRET` | configured on the prototype Worker |

Remote validation — Prototype Worker Activation v0.1 (2026-09-10): **PASS**,
69 checks passed (routes, login, workspace ownership, A/B and auth/anon
isolation, table lock). Cleanup returned `guest_workspace_records` to 0
validation rows.

Production go-live — route activated 2026-09-10: `guest / guest` production
login PASS; minimum production validation **7/7 PASS** (`/api/guest/session`
answers JSON, login, Quick → Integrated Workspace, refresh continuity, logout,
Pages homepage, validation data cleaned to 0).

### Deployment boundary

**Path-level routing only — the site was not converted to a Worker.**

```
www.wtlab.co (every other path) → Cloudflare Pages (normal frontend pages)
www.wtlab.co/api/guest/*        → wtlab-guest-workspace-prototype → wtlab-guest-workspace D1
workers.dev prototype URL       → same Worker, direct access
```

The route is persisted in `wrangler.jsonc`, so a later `wrangler deploy` keeps
it. Never widen it to `www.wtlab.co/*` or `www.wtlab.co/api/*` without a
separate decision. No member architecture, RBAC, persistent member storage or
cron was introduced.

### Cleanup

⚠️ **Standing reminder — these resources do not clean themselves up.** If the
guest-workspace direction is not pursued, both must be deleted explicitly:

```bash
npx wrangler delete --name wtlab-guest-workspace-prototype
npx wrangler d1 delete wtlab-guest-workspace
```

Then confirm the `www.wtlab.co/api/guest/*` route is gone from the `wtlab.co`
zone and remove the `routes` entry from `wrangler.jsonc`.

When Prototype Login is retired, cleanup must cover **both** the prototype
Worker deployment/resources as applicable **and** the three Prototype Login
Worker secrets. If the Worker itself is kept, remove the secrets explicitly:

```bash
npx wrangler secret delete PROTOTYPE_LOGIN_USERNAME --name wtlab-guest-workspace-prototype
npx wrangler secret delete PROTOTYPE_LOGIN_PASSWORD_SHA256 --name wtlab-guest-workspace-prototype
npx wrangler secret delete PROTOTYPE_SESSION_SECRET --name wtlab-guest-workspace-prototype
```

Retiring login does not by itself delete the Guest Workspace table or its D1
database; that is the separate step above.

**Orphaned session rows.** Observed during production validation on
2026-09-10: logging in while already logged in minted a new session and
stranded the previous session's rows. **Fixed 2026-09-11** (`00f4fd6`, Worker
`a7b41c83`): a login from a browser that already holds a valid signed session
keeps that session, including a second tab sharing its cookie. Production
check PASS — repeated login and second-tab login left 1 session / 1 row, and
logout cleaned it to 0. Unsigned, tampered or anonymous identities still get a
new session id.

Still orphaned, not fixed: anonymous rows written before logging in, and
sessions that are never logged out (browser closed, cookie expired).
Inactivity/TTL cleanup (`deleteInactiveBefore`) exists as code but has no
scheduled trigger, so those temporary rows remain until cleaned manually.

Promoting this Worker to serve the **whole** domain is a separate decision that
has **not** been made — the narrow guest route above is not that. It would mean
a whole-domain route or custom domain, a scheduled trigger for the inactivity
sweep (Pages Functions cannot do cron — only Workers can), and retiring or
repositioning the Pages project. None of that is in place today.

## Production smoke-test checklist

After each production deployment, verify:

1. `https://www.wtlab.co` loads with valid HTTPS
2. Homepage lists both instruments; navigation (Today/Instruments/Workspaces/Continuity/About) works
3. Instrument Library shows 2 × "Open Instrument" + 5 × "Prototype Planned"
4. Water Level Checker: Quick manual run returns results (e.g. 25/10/2mo/1mo → Caution, 2.5 months)
5. Water Level: blank template + input CSV download; re-upload runs
6. Arrival Collision Detector: Quick manual run returns results; Advanced CSV with capacity flags OVER
7. Result CSV exports download from both instruments
8. `/workspace/data-intake` demo flow works
9. Mobile width (375px): no horizontal overflow
10. Browser console: no application errors
11. `phoenix.wtlab.co` still serves Phoenix, unaffected
