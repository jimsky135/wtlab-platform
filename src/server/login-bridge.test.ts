// Prototype login bridge, exercised through the real HTTP surface and the
// real SQL.
//
// The claim this file has to prove: the guest ACCOUNT NAME is shared, the
// workspace SESSION is not. Two browsers both logging in as `guest` must end
// up with two independent workspaces — otherwise the whole prototype is a
// shared bucket wearing a login screen.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GUEST_COOKIE_NAME } from './guest-session.ts';
import { AUTH_COOKIE_NAME, sha256Hex } from './prototype-login.ts';
import {
	GUEST_LOGIN_PATH,
	GUEST_LOGOUT_PATH,
	GUEST_SESSION_PATH,
	GUEST_WORKSPACE_PATH,
	routeGuestApi,
	type RouterContext,
} from './router.ts';
import { createTestDatabase, type TestDatabase } from './test-support/sqlite-adapter.ts';

const ORIGIN = 'https://www.wtlab.co';
const SECRET = 'test-secret-not-a-real-key';

async function contextFor(db: TestDatabase): Promise<RouterContext> {
	return {
		db,
		now: () => new Date('2026-09-09T00:00:00.000Z'),
		secureCookies: true,
		login: { username: 'guest', passwordSha256: await sha256Hex('guest'), sessionSecret: SECRET },
	};
}

/** One browser: keeps every cookie the server sets and replays them. */
function createBrowser(context: RouterContext) {
	const jar = new Map<string, string>();

	async function send(method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>) {
		const headers = new Headers(extraHeaders ?? {});
		if (jar.size > 0) {
			headers.set('cookie', Array.from(jar, ([name, value]) => `${name}=${value}`).join('; '));
		}
		if (body !== undefined) headers.set('content-type', 'application/json');

		const response = await routeGuestApi(
			new Request(`${ORIGIN}${path}`, {
				method,
				headers,
				body: body === undefined ? undefined : JSON.stringify(body),
			}),
			context
		);
		assert.ok(response, `route must handle ${path}`);

		for (const [header, value] of response.headers) {
			if (header.toLowerCase() !== 'set-cookie') continue;
			const [pair, ...attrs] = value.split(';');
			const eq = pair.indexOf('=');
			const name = pair.slice(0, eq).trim();
			const cookieValue = pair.slice(eq + 1).trim();
			const expired = attrs.some((a) => a.trim().toLowerCase() === 'max-age=0');
			if (expired || cookieValue === '') jar.delete(name);
			else jar.set(name, cookieValue);
		}

		return { status: response.status, json: (await response.json()) as any };
	}

	return {
		login: (username = 'guest', password = 'guest') => send('POST', GUEST_LOGIN_PATH, { username, password }),
		logout: () => send('POST', GUEST_LOGOUT_PATH),
		session: () => send('GET', GUEST_SESSION_PATH),
		write: (datasetId: string, payload: string) => send('PUT', GUEST_WORKSPACE_PATH, { datasetId, payload }),
		read: () => send('GET', GUEST_WORKSPACE_PATH),
		send,
		cookie: (name: string) => jar.get(name) ?? null,
		setCookie: (name: string, value: string) => jar.set(name, value),
	};
}

// ---- login / logout basics ----

test('the prototype credential logs in and the session reports authenticated', async () => {
	const db = createTestDatabase();
	const browser = createBrowser(await contextFor(db));

	assert.equal((await browser.session()).json.authenticated, false);

	const result = await browser.login();
	assert.equal(result.status, 200);
	assert.equal(result.json.authenticated, true);
	assert.equal((await browser.session()).json.authenticated, true);
	db.close();
});

test('a wrong password is rejected and grants no session', async () => {
	const db = createTestDatabase();
	const browser = createBrowser(await contextFor(db));

	const result = await browser.login('guest', 'wrong');
	assert.equal(result.status, 401);
	assert.equal(result.json.authenticated, false);
	assert.equal(browser.cookie(AUTH_COOKIE_NAME), null, 'no auth cookie may be issued');
	assert.equal((await browser.session()).json.authenticated, false);
	db.close();
});

test('a missing password is rejected', async () => {
	const db = createTestDatabase();
	const browser = createBrowser(await contextFor(db));

	assert.equal((await browser.send('POST', GUEST_LOGIN_PATH, { username: 'guest' })).status, 401);
	assert.equal((await browser.send('POST', GUEST_LOGIN_PATH, {})).status, 401);
	assert.equal((await browser.session()).json.authenticated, false);
	db.close();
});

test('a forged username is ineffective', async () => {
	const db = createTestDatabase();
	const browser = createBrowser(await contextFor(db));
	assert.equal((await browser.login('admin', 'guest')).status, 401);
	assert.equal((await browser.login('guest ', 'guest')).status, 401);
	db.close();
});

test('failure messages do not distinguish bad username from bad password', async () => {
	const db = createTestDatabase();
	const browser = createBrowser(await contextFor(db));
	const badUser = await browser.login('nobody', 'guest');
	const badPass = await browser.login('guest', 'nope');
	assert.deepEqual(badUser.json, badPass.json);
	db.close();
});

// ---- session fixation ----

test('logging in mints a new session id — a pre-planted one is discarded', async () => {
	const db = createTestDatabase();
	const context = await contextFor(db);
	const browser = createBrowser(context);

	// Attacker pre-plants an id they know.
	const planted = 'f'.repeat(64);
	browser.setCookie(GUEST_COOKIE_NAME, planted);
	await browser.write('pre', 'anonymous-data');

	await browser.login();

	const authCookie = browser.cookie(AUTH_COOKIE_NAME);
	assert.ok(authCookie);
	assert.notEqual(authCookie.split('.')[0], planted, 'the planted id must not become the session');

	// And the authenticated workspace starts empty, not holding the pre-login rows.
	assert.deepEqual((await browser.read()).json.datasets, []);
	db.close();
});

test('logging in twice produces two different sessions', async () => {
	const db = createTestDatabase();
	const browser = createBrowser(await contextFor(db));

	await browser.login();
	const first = browser.cookie(AUTH_COOKIE_NAME);
	await browser.login();
	const second = browser.cookie(AUTH_COOKIE_NAME);

	assert.notEqual(first, second);
	db.close();
});

// ---- Phase 7: the core claim ----

test('two browsers both logged in as guest keep completely separate workspaces', async () => {
	const db = createTestDatabase();
	const context = await contextFor(db);
	const a = createBrowser(context);
	const b = createBrowser(context);

	await a.login();
	await b.login();
	await a.write('shared-name', 'A-data');
	await b.write('shared-name', 'B-data');

	assert.notEqual(a.cookie(AUTH_COOKIE_NAME), b.cookie(AUTH_COOKIE_NAME), 'same account, different sessions');

	const readA = await a.read();
	const readB = await b.read();
	assert.equal(readA.json.datasets.length, 1);
	assert.equal(readA.json.datasets[0].payload, 'A-data');
	assert.equal(readB.json.datasets.length, 1);
	assert.equal(readB.json.datasets[0].payload, 'B-data');
	assert.equal(db.totalRows(), 2, 'both workspaces coexist');
	db.close();
});

test('A logging out clears only A — B keeps working', async () => {
	const db = createTestDatabase();
	const context = await contextFor(db);
	const a = createBrowser(context);
	const b = createBrowser(context);

	await a.login();
	await b.login();
	await a.write('a', 'A-data');
	await b.write('b', 'B-data');

	await a.logout();

	const readB = await b.read();
	assert.equal(readB.json.datasets.length, 1, "B's workspace must survive A's logout");
	assert.equal(readB.json.datasets[0].payload, 'B-data');
	assert.equal((await b.session()).json.authenticated, true, 'B stays logged in');
	assert.equal(db.totalRows(), 1, "only A's rows were removed");
	db.close();
});

// ---- Phase 6: logout lifecycle ----

test('logout deletes the rows, expires the cookie, and the old identity reads nothing back', async () => {
	const db = createTestDatabase();
	const context = await contextFor(db);
	const browser = createBrowser(context);

	await browser.login();
	const oldCookie = browser.cookie(AUTH_COOKIE_NAME);
	assert.ok(oldCookie);
	await browser.write('notes', 'sensitive');
	assert.equal((await browser.read()).json.datasets.length, 1);

	await browser.logout();

	assert.equal(browser.cookie(AUTH_COOKIE_NAME), null, 'auth cookie expired');
	assert.equal((await browser.session()).json.authenticated, false);
	assert.equal(db.totalRows(), 0, 'workspace rows deleted at logout');

	// Replaying the old signed cookie must not resurrect the data.
	const replay = createBrowser(context);
	replay.setCookie(AUTH_COOKIE_NAME, oldCookie);
	assert.deepEqual((await replay.read()).json.datasets, [], 'old identity reads nothing back');
	db.close();
});

test('logging in again after logout gives a new identity and an empty workspace', async () => {
	const db = createTestDatabase();
	const browser = createBrowser(await contextFor(db));

	await browser.login();
	const before = browser.cookie(AUTH_COOKIE_NAME);
	await browser.write('notes', 'first-session');
	await browser.logout();

	await browser.login();
	const after = browser.cookie(AUTH_COOKIE_NAME);

	assert.notEqual(before, after, 'the old session id must not come back');
	assert.deepEqual((await browser.read()).json.datasets, [], 'new session starts empty');
	db.close();
});

// ---- Phase 5: continuity ----

test('a second tab in the same browser is already logged in and sees the same workspace', async () => {
	const db = createTestDatabase();
	const context = await contextFor(db);
	const tabA = createBrowser(context);

	await tabA.login();
	await tabA.write('shared', 'written-in-tab-A');

	// A second tab is the same cookie jar — nothing is copied between tabs.
	const tabB = createBrowser(context);
	tabB.setCookie(AUTH_COOKIE_NAME, tabA.cookie(AUTH_COOKIE_NAME)!);

	assert.equal((await tabB.session()).json.authenticated, true);
	const read = await tabB.read();
	assert.equal(read.json.datasets[0].payload, 'written-in-tab-A');
	db.close();
});

// ---- Phase 8: forged identity through request input ----

test('a forged session id in request input never switches ownership', async () => {
	const db = createTestDatabase();
	const context = await contextFor(db);
	const a = createBrowser(context);
	const b = createBrowser(context);

	await a.login();
	await b.login();
	await a.write('own', 'A-data');
	await b.write('secret', 'B-secret');

	const victimCookie = b.cookie(AUTH_COOKIE_NAME)!;
	const victimId = victimCookie.split('.')[0];

	const attempts: Array<[string, string, Record<string, string> | undefined]> = [
		['query id', `${GUEST_WORKSPACE_PATH}?sessionId=${victimId}`, undefined],
		['query signed', `${GUEST_WORKSPACE_PATH}?session=${encodeURIComponent(victimCookie)}`, undefined],
		['custom header', GUEST_WORKSPACE_PATH, { 'x-session-id': victimId }],
		['auth header', GUEST_WORKSPACE_PATH, { authorization: `Bearer ${victimCookie}` }],
	];

	for (const [label, path, headers] of attempts) {
		const result = await a.send('GET', path, undefined, headers);
		assert.equal(result.json.datasets.length, 1, `${label}: leaked`);
		assert.equal(result.json.datasets[0].payload, 'A-data', `${label}: got B's data`);
	}

	// And through the body on a write.
	await a.send('PUT', GUEST_WORKSPACE_PATH, {
		datasetId: 'own',
		payload: 'A-second',
		sessionId: victimId,
	});
	assert.equal((await b.read()).json.datasets[0].payload, 'B-secret', 'body forgery must not write into B');
	db.close();
});

test('an anonymous cookie carrying an authenticated session id gains nothing', async () => {
	const db = createTestDatabase();
	const context = await contextFor(db);
	const victim = createBrowser(context);
	await victim.login();
	await victim.write('secret', 'B-secret');

	// Strip the signature and present the bare id as an anonymous cookie.
	const bareId = victim.cookie(AUTH_COOKIE_NAME)!.split('.')[0];
	const attacker = createBrowser(context);
	attacker.setCookie(GUEST_COOKIE_NAME, bareId);

	const result = await attacker.read();
	assert.deepEqual(result.json.datasets, [], 'the unsigned id must not reach the signed workspace');
	db.close();
});

// ---- anonymous path still works ----

test('the anonymous guest workspace is unaffected when login is not configured', async () => {
	const db = createTestDatabase();
	const context: RouterContext = {
		db,
		now: () => new Date('2026-09-09T00:00:00.000Z'),
		secureCookies: true,
	};
	const browser = createBrowser(context);

	await browser.write('anon', 'still-works');
	assert.equal((await browser.read()).json.datasets[0].payload, 'still-works');

	const session = await browser.session();
	assert.equal(session.json.authenticated, false);
	assert.equal(session.json.loginAvailable, false);
	assert.equal((await browser.login()).status, 503, 'login is simply unavailable, not broken');
	db.close();
});
