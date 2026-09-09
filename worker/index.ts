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
	/**
	 * Prototype login configuration. Supplied by `.dev.vars` locally and
	 * Worker secrets remotely — never compiled in, so no credential value
	 * exists in the repository. When any part is absent the login bridge is
	 * simply unavailable and the anonymous guest workspace still works.
	 */
	PROTOTYPE_LOGIN_USERNAME?: string;
	PROTOTYPE_LOGIN_PASSWORD_SHA256?: string;
	PROTOTYPE_SESSION_SECRET?: string;
}

function loginConfig(env: Env) {
	const { PROTOTYPE_LOGIN_USERNAME, PROTOTYPE_LOGIN_PASSWORD_SHA256, PROTOTYPE_SESSION_SECRET } = env;
	if (!PROTOTYPE_LOGIN_USERNAME || !PROTOTYPE_LOGIN_PASSWORD_SHA256 || !PROTOTYPE_SESSION_SECRET) {
		return undefined;
	}
	return {
		username: PROTOTYPE_LOGIN_USERNAME,
		passwordSha256: PROTOTYPE_LOGIN_PASSWORD_SHA256,
		sessionSecret: PROTOTYPE_SESSION_SECRET,
	};
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const response = await routeGuestApi(request, {
			db: env.DB,
			now: () => new Date(),
			secureCookies: new URL(request.url).protocol === 'https:',
			login: loginConfig(env),
		});
		if (response) return response;

		// An /api/ path the guest router did not claim is answered here, not
		// handed to the asset pipeline. There is no other API on this Worker,
		// and this makes that a decision rather than a side effect of asset
		// 404 handling: an unmatched API path never reaches identity
		// resolution and never reaches D1.
		if (new URL(request.url).pathname.startsWith('/api/')) {
			return new Response(JSON.stringify({ error: 'NOT_FOUND' }), {
				status: 404,
				headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
			});
		}

		// Everything else is the static site, served exactly as built.
		return env.ASSETS.fetch(request);
	},
};
