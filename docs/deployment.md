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
sit deliberately outside the production path:

| Resource | Name | State |
|---|---|---|
| Worker | `wtlab-guest-workspace-prototype` | Deployed. `workers.dev` URL only — **no custom domain, no route, no cron** |
| D1 database | `wtlab-guest-workspace` | Created (APAC). Migration `0001` applied. Validation rows cleaned; 0 rows |

Why the Worker is not named `wtlab-platform`: that name belongs to the Pages
project serving `www.wtlab.co`. The prototype keeps a distinct name so it can
never collide with production.

**Production is unaffected.** `www.wtlab.co` continues to be served by the
Cloudflare Pages project. Nothing routes to the prototype Worker.

⚠️ **Standing reminder — these resources do not clean themselves up.** If the
guest-workspace direction is not pursued, both must be deleted explicitly:

```bash
npx wrangler delete --name wtlab-guest-workspace-prototype
npx wrangler d1 delete wtlab-guest-workspace
```

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
