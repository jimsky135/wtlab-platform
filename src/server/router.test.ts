// Phase 5 — mandatory isolation proof, exercised through the real HTTP
// surface and the real SQL.
//
// Two guests are simulated the way browsers actually behave: each keeps the
// cookie the server gave it and sends it back. Nothing else about a request
// is allowed to influence which workspace is touched.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GUEST_COOKIE_NAME } from './guest-session.ts';
import { GUEST_WORKSPACE_PATH, routeGuestApi, type RouterContext } from './router.ts';
import { createTestDatabase, type TestDatabase } from './test-support/sqlite-adapter.ts';

const ORIGIN = 'https://www.wtlab.co';

function contextFor(db: TestDatabase, now = '2026-09-09T00:00:00.000Z'): RouterContext {
	return { db, now: () => new Date(now), secureCookies: true };
}

/** A browser that keeps whatever cookie the server sets and replays it. */
function createGuestClient(context: RouterContext) {
	let cookie: string | null = null;

	async function send(
		method: string,
		body?: unknown,
		extra?: { url?: string; headers?: Record<string, string> }
	): Promise<{ status: number; json: any }> {
		const headers = new Headers(extra?.headers ?? {});
		if (cookie) headers.set('cookie', cookie);
		if (body !== undefined) headers.set('content-type', 'application/json');

		const request = new Request(`${ORIGIN}${extra?.url ?? GUEST_WORKSPACE_PATH}`, {
			method,
			headers,
			body: body === undefined ? undefined : JSON.stringify(body),
		});

		const response = await routeGuestApi(request, context);
		assert.ok(response, 'route must handle the guest workspace path');

		const setCookie = response.headers.get('set-cookie');
		if (setCookie) {
			const value = setCookie.split(';')[0];
			cookie = value.endsWith('=') ? null : value;
		}
		return { status: response.status, json: await response.json() };
	}

	return {
		send,
		sessionId: () => (cookie ? cookie.slice(GUEST_COOKIE_NAME.length + 1) : null),
		setRawCookie: (value: string | null) => {
			cookie = value;
		},
	};
}

test('a first-time guest is given a server-generated identity', async () => {
	const db = createTestDatabase();
	const guest = createGuestClient(contextFor(db));

	const result = await guest.send('GET');
	assert.equal(result.status, 200);
	assert.deepEqual(result.json.datasets, []);
	assert.match(guest.sessionId() ?? '', /^[0-9a-f]{64}$/);
	db.close();
});

test('a guest writes, reads back, and clears its own workspace', async () => {
	const db = createTestDatabase();
	const guest = createGuestClient(contextFor(db));

	const written = await guest.send('PUT', { datasetId: 'notes', payload: '{"v":1}' });
	assert.equal(written.status, 200);
	assert.equal(written.json.datasets.length, 1);

	const read = await guest.send('GET');
	assert.equal(read.json.datasets[0].payload, '{"v":1}');

	const cleared = await guest.send('DELETE');
	assert.deepEqual(cleared.json.datasets, []);
	db.close();
});

// ---- Phase 5: A / B isolation ----

test('Guest A and Guest B each read only their own data', async () => {
	const db = createTestDatabase();
	const context = contextFor(db);
	const a = createGuestClient(context);
	const b = createGuestClient(context);

	await a.send('PUT', { datasetId: 'dataset', payload: 'A-only' });
	await b.send('PUT', { datasetId: 'dataset', payload: 'B-only' });

	assert.notEqual(a.sessionId(), b.sessionId(), 'each guest gets a distinct identity');

	const readA = await a.send('GET');
	const readB = await b.send('GET');

	assert.equal(readA.json.datasets.length, 1);
	assert.equal(readA.json.datasets[0].payload, 'A-only');
	assert.equal(readB.json.datasets.length, 1);
	assert.equal(readB.json.datasets[0].payload, 'B-only');
	db.close();
});

test('A writing the same dataset id cannot overwrite B', async () => {
	const db = createTestDatabase();
	const context = contextFor(db);
	const a = createGuestClient(context);
	const b = createGuestClient(context);

	await b.send('PUT', { datasetId: 'dataset', payload: 'B-original' });
	await a.send('PUT', { datasetId: 'dataset', payload: 'A-overwrite-attempt' });

	const readB = await b.send('GET');
	assert.equal(readB.json.datasets[0].payload, 'B-original', "B's data must be untouched");
	db.close();
});

test('A clearing its workspace cannot clear B', async () => {
	const db = createTestDatabase();
	const context = contextFor(db);
	const a = createGuestClient(context);
	const b = createGuestClient(context);

	await a.send('PUT', { datasetId: 'a', payload: 'A' });
	await b.send('PUT', { datasetId: 'b', payload: 'B' });

	await a.send('DELETE');

	const readB = await b.send('GET');
	assert.equal(readB.json.datasets.length, 1, "B still holds its data after A cleared");
	assert.equal(readB.json.datasets[0].payload, 'B');
	db.close();
});

// ---- Phase 5: forged identity must never switch ownership ----

test("B's session id supplied through request input never reaches A's ownership", async () => {
	const db = createTestDatabase();
	const context = contextFor(db);
	const a = createGuestClient(context);
	const b = createGuestClient(context);

	await b.send('PUT', { datasetId: 'secret', payload: 'B-secret' });
	await a.send('PUT', { datasetId: 'own', payload: 'A-own' });
	const victim = b.sessionId();
	assert.ok(victim);

	// Every client-controllable channel, one at a time.
	const forgeries: Array<{ label: string; url?: string; headers?: Record<string, string>; body?: unknown }> = [
		{ label: 'query string', url: `${GUEST_WORKSPACE_PATH}?sessionId=${victim}` },
		{ label: 'query string (alt name)', url: `${GUEST_WORKSPACE_PATH}?session_id=${victim}` },
		{ label: 'custom header', headers: { 'x-session-id': victim } },
		{ label: 'authorization header', headers: { authorization: `Bearer ${victim}` } },
	];

	for (const forgery of forgeries) {
		const result = await a.send('GET', undefined, { url: forgery.url, headers: forgery.headers });
		assert.equal(result.json.datasets.length, 1, `${forgery.label}: leaked row count`);
		assert.equal(result.json.datasets[0].payload, 'A-own', `${forgery.label}: leaked B's data to A`);
	}

	// And through the request body on a write.
	await a.send('PUT', { datasetId: 'own', payload: 'A-second', sessionId: victim });
	const readB = await b.send('GET');
	assert.equal(readB.json.datasets.length, 1, 'body-supplied session id must not write into B');
	assert.equal(readB.json.datasets[0].payload, 'B-secret');
	db.close();
});

test('a guest that pastes another guest cookie value can only be that guest — never both', async () => {
	// Cookies are the trusted channel, so copying one IS becoming that guest.
	// What must not happen is a request carrying its own cookie being steered
	// elsewhere by any other input, which the previous test covers. Here we
	// confirm the boundary is the cookie and nothing but the cookie.
	const db = createTestDatabase();
	const context = contextFor(db);
	const a = createGuestClient(context);
	const b = createGuestClient(context);

	await a.send('PUT', { datasetId: 'a', payload: 'A' });
	await b.send('PUT', { datasetId: 'b', payload: 'B' });

	const stolen = `${GUEST_COOKIE_NAME}=${b.sessionId()}`;
	a.setRawCookie(stolen);
	const result = await a.send('GET');

	assert.equal(result.json.datasets.length, 1);
	assert.equal(result.json.datasets[0].payload, 'B', 'the cookie alone decides identity');
	db.close();
});

test('a garbage cookie mints a fresh empty workspace rather than matching anyone', async () => {
	const db = createTestDatabase();
	const context = contextFor(db);
	const victim = createGuestClient(context);
	await victim.send('PUT', { datasetId: 'v', payload: 'victim' });

	const attacker = createGuestClient(context);
	attacker.setRawCookie(`${GUEST_COOKIE_NAME}=' OR 1=1 --`);
	const result = await attacker.send('GET');

	assert.deepEqual(result.json.datasets, [], 'malformed identity must not match any session');
	assert.match(attacker.sessionId() ?? '', /^[0-9a-f]{64}$/, 'a fresh identity is issued instead');
	db.close();
});

// ---- input validation ----

test('invalid dataset ids and payloads are refused', async () => {
	const db = createTestDatabase();
	const guest = createGuestClient(contextFor(db));

	assert.equal((await guest.send('PUT', { datasetId: 'bad id', payload: 'x' })).status, 400);
	assert.equal((await guest.send('PUT', { datasetId: 'ok', payload: '' })).status, 400);
	assert.equal((await guest.send('PUT', { datasetId: '', payload: 'x' })).status, 400);
	assert.equal((await guest.send('POST', { datasetId: 'ok', payload: 'x' })).status, 405);
	db.close();
});

test('guest responses are never stored by a shared cache', async () => {
	const db = createTestDatabase();
	const request = new Request(`${ORIGIN}${GUEST_WORKSPACE_PATH}`, { method: 'GET' });
	const response = await routeGuestApi(request, contextFor(db));
	assert.equal(response?.headers.get('cache-control'), 'no-store');
	db.close();
});

test('a non-guest path is not handled by the guest router', async () => {
	const db = createTestDatabase();
	const request = new Request(`${ORIGIN}/api/something-else`, { method: 'GET' });
	assert.equal(await routeGuestApi(request, contextFor(db)), null);
	db.close();
});
