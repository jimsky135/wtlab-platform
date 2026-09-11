// Guest workspace HTTP surface.
//
// The whole security posture of this prototype is one line, repeated: the
// session id comes from `readGuestSessionId(request.headers.get('cookie'))`
// and from nowhere else. No route reads an owner id from the path, the query
// string, the body, or a custom header — so there is no input a client can
// use to name another Guest's workspace.
//
// There is deliberately no administrative or cross-session route here.

import {
	clearedGuestSessionCookie,
	createGuestSessionId,
	guestSessionCookie,
	readGuestSessionId,
} from './guest-session.ts';
import {
	MAX_DATASETS_PER_SESSION,
	MAX_PAYLOAD_BYTES,
	clearWorkspace,
	countDatasets,
	isDatasetId,
	listDatasets,
	putDataset,
} from './guest-workspace.ts';
import {
	authSessionCookie,
	clearedAuthCookie,
	createAuthenticatedSession,
	readAuthenticatedSessionId,
	signSessionId,
	verifyPrototypeCredentials,
	type PrototypeLoginConfig,
} from './prototype-login.ts';
import type { SqlDatabase } from './sql.ts';

export const GUEST_WORKSPACE_PATH = '/api/guest/workspace';
export const GUEST_LOGIN_PATH = '/api/guest/login';
export const GUEST_LOGOUT_PATH = '/api/guest/logout';
export const GUEST_SESSION_PATH = '/api/guest/session';

/** Prototype session lifetime — not a retention policy (ADR-0004 defers that). */
export const PROTOTYPE_AUTH_MAX_AGE_SECONDS = 60 * 60 * 12;

export interface RouterContext {
	db: SqlDatabase;
	/** Injected so tests control time; production passes the real clock. */
	now(): Date;
	/** False only for plain-HTTP local verification, where Secure would drop the cookie. */
	secureCookies: boolean;
	/**
	 * Prototype credential + signing key from server configuration. Absent
	 * means the login bridge is simply not available; the anonymous guest
	 * workspace continues to work exactly as before.
	 */
	login?: PrototypeLoginConfig;
}

/**
 * Who this request is, resolved server-side only.
 *
 * An authenticated session wins over an anonymous one, and is trusted only
 * when its cookie signature verifies. Nothing else on the request — path,
 * query, body, header — participates.
 *
 * The two kinds own rows in SEPARATE namespaces (`auth:` / `anon:`), which
 * matters more than it looks: without it, stripping the signature off an
 * authenticated cookie and replaying the bare id as an anonymous cookie
 * would land on the same `session_id` and hand over that workspace. The
 * prefix means an unsigned id can only ever reach anonymous rows.
 */
async function resolveIdentity(
	request: Request,
	context: RouterContext
): Promise<{ ownerId: string; authenticated: boolean; cookie?: string }> {
	const cookieHeader = request.headers.get('cookie');

	if (context.login) {
		const authenticated = await readAuthenticatedSessionId(context.login.sessionSecret, cookieHeader);
		if (authenticated) return { ownerId: `auth:${authenticated}`, authenticated: true };
	}

	const existing = readGuestSessionId(cookieHeader);
	if (existing) return { ownerId: `anon:${existing}`, authenticated: false };

	const sessionId = createGuestSessionId();
	return {
		ownerId: `anon:${sessionId}`,
		authenticated: false,
		cookie: guestSessionCookie(sessionId, { secure: context.secureCookies }),
	};
}

function json(body: unknown, init: { status?: number; cookie?: string } = {}): Response {
	const headers = new Headers({ 'content-type': 'application/json; charset=utf-8' });
	// Guest working state is per-visitor and must never be cached by a shared cache.
	headers.set('cache-control', 'no-store');
	if (init.cookie) headers.append('set-cookie', init.cookie);
	return new Response(JSON.stringify(body), { status: init.status ?? 200, headers });
}

export async function handleGuestWorkspace(request: Request, context: RouterContext): Promise<Response> {
	const { db, secureCookies } = context;
	const { ownerId, cookie } = await resolveIdentity(request, context);
	const now = context.now().toISOString();

	if (request.method === 'GET') {
		const datasets = await listDatasets(db, ownerId);
		return json({ datasets }, { cookie });
	}

	if (request.method === 'PUT') {
		let body: unknown;
		try {
			body = await request.json();
		} catch {
			return json({ error: 'INVALID_JSON' }, { status: 400, cookie });
		}

		const input = body as { datasetId?: unknown; payload?: unknown } | null;
		const datasetId = typeof input?.datasetId === 'string' ? input.datasetId : '';
		const payload = typeof input?.payload === 'string' ? input.payload : '';

		if (!isDatasetId(datasetId)) {
			return json({ error: 'INVALID_DATASET_ID' }, { status: 400, cookie });
		}
		if (payload === '' || new TextEncoder().encode(payload).length > MAX_PAYLOAD_BYTES) {
			return json({ error: 'INVALID_PAYLOAD' }, { status: 400, cookie });
		}

		// Bound how much one anonymous visitor can accumulate.
		const existingCount = await countDatasets(db, ownerId);
		const datasets = await listDatasets(db, ownerId);
		const isNew = !datasets.some((dataset) => dataset.datasetId === datasetId);
		if (isNew && existingCount >= MAX_DATASETS_PER_SESSION) {
			return json({ error: 'DATASET_LIMIT_REACHED' }, { status: 409, cookie });
		}

		await putDataset(db, ownerId, datasetId, payload, now);
		return json({ datasets: await listDatasets(db, ownerId) }, { cookie });
	}

	if (request.method === 'DELETE') {
		await clearWorkspace(db, ownerId);
		// Ending a Guest session also drops the identity, so the next visit
		// starts clean rather than re-attaching to an emptied workspace.
		return json({ datasets: [] }, { cookie: clearedGuestSessionCookie({ secure: secureCookies }) });
	}

	return json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405, cookie });
}

/**
 * Prototype login. Credentials are always checked first; failure changes
 * nothing at all — no session is issued, and the caller keeps whatever
 * identity it already had.
 *
 * On success, a request that already holds a valid SIGNED session keeps it.
 * A second login from the same browser (e.g. another tab still showing the
 * form) must not strand the first session's rows where logout can no longer
 * reach them. Only a signature this server produced can take that branch,
 * so session fixation stays pointless: a planted anonymous id, or an
 * unsigned / tampered auth cookie, still gets a brand-new session id.
 */
export async function handleGuestLogin(request: Request, context: RouterContext): Promise<Response> {
	if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
	if (!context.login) return json({ error: 'LOGIN_NOT_CONFIGURED' }, { status: 503 });

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'INVALID_JSON' }, { status: 400 });
	}

	const input = body as { username?: unknown; password?: unknown } | null;
	const ok = await verifyPrototypeCredentials(context.login, input?.username, input?.password);
	if (!ok) {
		// One message for every failure mode, so nothing distinguishes a bad
		// username from a bad password.
		return json({ error: 'INVALID_CREDENTIALS', authenticated: false }, { status: 401 });
	}

	const existing = await readAuthenticatedSessionId(context.login.sessionSecret, request.headers.get('cookie'));
	const cookieValue = existing
		? await signSessionId(context.login.sessionSecret, existing)
		: (await createAuthenticatedSession(context.login.sessionSecret)).cookieValue;
	return json(
		{ authenticated: true },
		{
			cookie: authSessionCookie(cookieValue, {
				secure: context.secureCookies,
				maxAgeSeconds: PROTOTYPE_AUTH_MAX_AGE_SECONDS,
			}),
		}
	);
}

/**
 * Logout ends the session AND deletes its workspace rows, so replaying the
 * old cookie cannot read anything back. The cookie is expired as well.
 */
export async function handleGuestLogout(request: Request, context: RouterContext): Promise<Response> {
	if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });

	const { ownerId, authenticated } = await resolveIdentity(request, context);
	if (authenticated) await clearWorkspace(context.db, ownerId);

	return json(
		{ authenticated: false },
		{ cookie: clearedAuthCookie({ secure: context.secureCookies }) }
	);
}

/** Whether this request currently holds a valid authenticated session. */
export async function handleGuestSession(request: Request, context: RouterContext): Promise<Response> {
	const { authenticated } = await resolveIdentity(request, context);
	return json({ authenticated, loginAvailable: context.login !== undefined });
}

/** Returns null for anything that is not a Guest API route. */
export async function routeGuestApi(request: Request, context: RouterContext): Promise<Response | null> {
	const { pathname } = new URL(request.url);
	if (pathname === GUEST_WORKSPACE_PATH) return handleGuestWorkspace(request, context);
	if (pathname === GUEST_LOGIN_PATH) return handleGuestLogin(request, context);
	if (pathname === GUEST_LOGOUT_PATH) return handleGuestLogout(request, context);
	if (pathname === GUEST_SESSION_PATH) return handleGuestSession(request, context);
	return null;
}
