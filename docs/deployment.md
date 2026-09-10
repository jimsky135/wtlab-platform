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

This describes the **Pages surface** (`www.wtlab.co`). The Pages build ships the Integrated Workspace guest UI but no Guest API backend; the server-backed prototype runs on a separate Worker (ADR-0004) — see [Prototype resources](#prototype-resources--live-not-production).

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

- `www.wtlab.co` — this project (Pages custom domain).
- `wtlab.co` — redirect only, via a zone-level Redirect Rule; carries no content.
- `phoenix.wtlab.co` — belongs to Project Phoenix. No DNS record, Pages project, or rule of Phoenix may be modified when operating on this project.

## Prototype resources — live, not production

The Guest Workspace Foundation (ADR-0004, commit `e47a8c7`) created **real
Cloudflare resources that are still running**. They are validation-only and
sit deliberately outside the production path.

Current reality as of **2026-09-10**, split into three separate surfaces.

### A. Repository / Pages — `www.wtlab.co`

| | |
|---|---|
| `main` | `70cb437` |
| Frontend | Current repo frontend is deployed (Integrated Workspace login panel markup and workspace-tag styles are live) |
| Guest API backend | **None.** Pages has no Guest Workspace API route |
| Guest login | **Not functional on `www.wtlab.co`** |

Known behaviour — do not misread it:

- `GET /api/guest/session` may return **HTTP 200**. That is the Pages
  unknown-route fallback serving homepage HTML, **not a working API** (see the
  Pages fallback HOLD entry in [engineering.md](engineering.md)).
- `POST /api/guest/login` returns a Pages-side **405**.
- The production login UI therefore reports that login is unavailable in this
  environment.

### B. Prototype Worker

| | |
|---|---|
| Worker | `wtlab-guest-workspace-prototype` |
| Current version | `3190914d-778a-4305-a7f7-f741e37ecbd9` (deployed from `main` @ `70cb437`) |
| URL | https://wtlab-guest-workspace-prototype.jimchiu0627.workers.dev |
| D1 database | `wtlab-guest-workspace` (APAC). Migration `0001` applied |
| Bindings | `DB`, `ASSETS` |
| Triggers | `workers.dev` only — **no custom route, no custom domain, no cron** |

Why the Worker is not named `wtlab-platform`: that name belongs to the Pages
project serving `www.wtlab.co`. The prototype keeps a distinct name so it can
never collide with production.

### C. Prototype Login (Worker only)

| Method | Route | |
|---|---|---|
| `GET` | `/api/guest/workspace` | List the caller's own datasets |
| `PUT` | `/api/guest/workspace` | Write (upsert) one dataset |
| `DELETE` | `/api/guest/workspace` | Clear the caller's own datasets |
| `GET` | `/api/guest/session` | `{ authenticated, loginAvailable }` |
| `POST` | `/api/guest/login` | Prototype login (`guest / guest`) |
| `POST` | `/api/guest/logout` | End the session and clear that owner's rows |

Workspace writes are **`PUT`**. `POST /api/guest/workspace` returns **405 by
design**. Any other `/api/*` path returns an explicit JSON 404 `NOT_FOUND`.

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

### Deployment boundary

**The prototype Worker working does NOT mean `www.wtlab.co` production login is
connected.** Current topology:

```
www.wtlab.co           → Cloudflare Pages frontend → no Guest API backend route
workers.dev prototype  → Worker + D1               → Guest Login + Guest Workspace functional
```

There is currently no route connecting `www.wtlab.co/api/guest/*` to the
prototype Worker. This is intentional and remains a separate future deployment
decision. `www.wtlab.co` continues to be served by the Cloudflare Pages project.

### Cleanup

⚠️ **Standing reminder — these resources do not clean themselves up.** If the
guest-workspace direction is not pursued, both must be deleted explicitly:

```bash
npx wrangler delete --name wtlab-guest-workspace-prototype
npx wrangler d1 delete wtlab-guest-workspace
```

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

Conversely, promoting this Worker to production is a separate decision that
has **not** been made. It would mean claiming a route or custom domain,
provisioning a scheduled trigger for the inactivity sweep (Pages Functions
cannot do cron — only Workers can), and retiring or repositioning the Pages
project. None of that is in place today.

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
