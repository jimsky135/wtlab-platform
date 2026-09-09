// WTLab Worker entry — static-first (ADR-0004).
//
// Astro still builds pure static output; this Worker serves those assets
// unchanged and owns nothing but the small `/api/*` surface. No instrument
// calculation runs here: the seven instruments stay client-side modules.

import { routeGuestApi } from '../src/server/router.ts';
import type { SqlDatabase } from '../src/server/sql.ts';

export interface Env {
	/** WTLab-owned D1. Never Phoenix's database. */
	DB: SqlDatabase;
	ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const response = await routeGuestApi(request, {
			db: env.DB,
			now: () => new Date(),
			secureCookies: new URL(request.url).protocol === 'https:',
		});
		if (response) return response;

		// Everything else is the static site, served exactly as built.
		return env.ASSETS.fetch(request);
	},
};
