# wtlab-platform

**WTLab** is a public, modular platform of independent tools and widgets — supply chain & inventory, risk & decision, business & finance, production & operations, everyday utilities, and future AI-assisted analysis tools. WTLab is not tied to any single industry.

**Project Phoenix** is the internal development codename for this platform. `wtlab-platform` is the repository.

The platform is built around a **shell + independent tools** model: a thin platform shell hosts tools that can each be developed, tested, and enabled/disabled independently.

## MVP Tech Stack

Per [ADR-0001](docs/adr/0001-mvp-frontend-and-deployment-stack.md):

- [Astro](https://astro.build) — Static Output
- TypeScript
- No UI framework (no React / Vue / Svelte) in the MVP
- No backend, no database, no auth, no payments in the MVP
- Deployment: [Cloudflare Pages](https://pages.cloudflare.com/), via GitHub integration

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Static output is generated into `dist/`.

## Repository Structure

```
src/
  components/   # shared UI components (empty — MVP has no components yet)
  layouts/      # shared page layouts (empty — MVP homepage has none yet)
  pages/        # Astro file-based routes (homepage lives here)
  platform/     # platform shell logic (empty — not built yet)
  tools/        # individual tools, one per directory (empty — first tool not implemented yet)
  shared/       # code shared across tools (empty — not built yet)
docs/
  adr/          # Architecture Decision Records
public/         # static assets
```

## ADR

Architecture decisions are recorded under [`docs/adr/`](docs/adr/). Start with [ADR-0001: MVP Frontend and Deployment Stack](docs/adr/0001-mvp-frontend-and-deployment-stack.md).
