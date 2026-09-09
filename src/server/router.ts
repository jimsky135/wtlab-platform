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
import type { SqlDatabase } from './sql.ts';

export const GUEST_WORKSPACE_PATH = '/api/guest/workspace';

export interface RouterContext {
	db: SqlDatabase;
	/** Injected so tests control time; production passes the real clock. */
	now(): Date;
	/** False only for plain-HTTP local verification, where Secure would drop the cookie. */
	secureCookies: boolean;
}

function json(body: unknown, init: { status?: number; cookie?: string } = {}): Response {
	const headers = new Headers({ 'content-type': 'application/json; charset=utf-8' });
	// Guest working state is per-visitor and must never be cached by a shared cache.
	headers.set('cache-control', 'no-store');
	if (init.cookie) headers.append('set-cookie', init.cookie);
	return new Response(JSON.stringify(body), { status: init.status ?? 200, headers });
}

/**
 * Resolves the Guest for this request, minting an identity when there is no
 * usable cookie. Returns the cookie to set, when a new one was issued.
 */
function resolveGuest(request: Request, secure: boolean): { sessionId: string; cookie?: string } {
	const existing = readGuestSessionId(request.headers.get('cookie'));
	if (existing) return { sessionId: existing };

	const sessionId = createGuestSessionId();
	return { sessionId, cookie: guestSessionCookie(sessionId, { secure }) };
}

export async function handleGuestWorkspace(request: Request, context: RouterContext): Promise<Response> {
	const { db, secureCookies } = context;
	const { sessionId, cookie } = resolveGuest(request, secureCookies);
	const now = context.now().toISOString();

	if (request.method === 'GET') {
		const datasets = await listDatasets(db, sessionId);
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
		const existingCount = await countDatasets(db, sessionId);
		const datasets = await listDatasets(db, sessionId);
		const isNew = !datasets.some((dataset) => dataset.datasetId === datasetId);
		if (isNew && existingCount >= MAX_DATASETS_PER_SESSION) {
			return json({ error: 'DATASET_LIMIT_REACHED' }, { status: 409, cookie });
		}

		await putDataset(db, sessionId, datasetId, payload, now);
		return json({ datasets: await listDatasets(db, sessionId) }, { cookie });
	}

	if (request.method === 'DELETE') {
		await clearWorkspace(db, sessionId);
		// Ending a Guest session also drops the identity, so the next visit
		// starts clean rather than re-attaching to an emptied workspace.
		return json({ datasets: [] }, { cookie: clearedGuestSessionCookie({ secure: secureCookies }) });
	}

	return json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405, cookie });
}

/** Returns null for anything that is not a Guest workspace route. */
export async function routeGuestApi(request: Request, context: RouterContext): Promise<Response | null> {
	const { pathname } = new URL(request.url);
	if (pathname !== GUEST_WORKSPACE_PATH) return null;
	return handleGuestWorkspace(request, context);
}
