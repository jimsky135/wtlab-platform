// Guest Workspace Table Lock v0.1.
//
// Two independent limits, tested independently:
//
//   Table lock    — a guest request can only ever reach guest_workspace_records
//   Row ownership — inside it, only rows owned by the server-resolved session
//
// The table-lock tests use a spying database that records the SQL actually
// executed, so the claim is checked against the statements themselves rather
// than against the absence of an obvious endpoint.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GUEST_WORKSPACE_TABLE } from './guest-workspace.ts';
import { AUTH_COOKIE_NAME, sha256Hex } from './prototype-login.ts';
import {
	GUEST_LOGIN_PATH,
	GUEST_LOGOUT_PATH,
	GUEST_SESSION_PATH,
	GUEST_WORKSPACE_PATH,
	routeGuestApi,
	type RouterContext,
} from './router.ts';
import type { SqlDatabase } from './sql.ts';
import { createTestDatabase, type TestDatabase } from './test-support/sqlite-adapter.ts';

const ORIGIN = 'https://www.wtlab.co';
const SECRET = 'test-secret-not-a-real-key';

async function loginConfig() {
	return { username: 'guest', passwordSha256: await sha256Hex('guest'), sessionSecret: SECRET };
}

async function contextFor(db: SqlDatabase): Promise<RouterContext> {
	return { db, now: () => new Date('2026-09-09T00:00:00.000Z'), secureCookies: true, login: await loginConfig() };
}

/** Wraps a real database and records every SQL string that reaches it. */
function spyOn(inner: TestDatabase) {
	const statements: string[] = [];
	const db: SqlDatabase = {
		prepare(sql: string) {
			statements.push(sql);
			return inner.prepare(sql);
		},
	};
	return { db, statements, close: () => inner.close(), totalRows: () => inner.totalRows() };
}

/**
 * Every table named in a statement, whatever the clause.
 *
 * SQL keywords are filtered out because the upsert's `DO UPDATE SET` would
 * otherwise read as a table called "SET".
 */
const SQL_KEYWORDS = new Set(['SET', 'SELECT', 'VALUES', 'WHERE', 'DO', 'NOTHING']);

function tablesIn(sql: string): string[] {
	return [...sql.matchAll(/\b(?:FROM|INTO|UPDATE|JOIN|TABLE)\s+([A-Za-z_][A-Za-z0-9_]*)/gi)]
		.map((match) => match[1])
		.filter((name) => !SQL_KEYWORDS.has(name.toUpperCase()));
}

async function send(
	context: RouterContext,
	method: string,
	path: string,
	options: { body?: unknown; cookie?: string; headers?: Record<string, string> } = {}
) {
	const headers = new Headers(options.headers ?? {});
	if (options.cookie) headers.set('cookie', options.cookie);
	if (options.body !== undefined) headers.set('content-type', 'application/json');
	return routeGuestApi(
		new Request(`${ORIGIN}${path}`, {
			method,
			headers,
			body: options.body === undefined ? undefined : JSON.stringify(options.body),
		}),
		context
	);
}

// ---- B. arbitrary table ----

test('every statement a guest request produces names only guest_workspace_records', async () => {
	const spy = spyOn(createTestDatabase());
	const context = await contextFor(spy.db);

	// Exercise the whole surface: session, write, read, logout.
	await send(context, 'GET', GUEST_SESSION_PATH);
	const login = await send(context, 'POST', GUEST_LOGIN_PATH, { body: { username: 'guest', password: 'guest' } });
	const cookie = login!.headers.get('set-cookie')!.split(';')[0];
	await send(context, 'PUT', GUEST_WORKSPACE_PATH, { cookie, body: { datasetId: 'd', payload: 'p' } });
	await send(context, 'GET', GUEST_WORKSPACE_PATH, { cookie });
	await send(context, 'DELETE', GUEST_WORKSPACE_PATH, { cookie });
	await send(context, 'POST', GUEST_LOGOUT_PATH, { cookie });

	assert.ok(spy.statements.length > 0, 'the surface must actually touch the database');
	for (const sql of spy.statements) {
		for (const table of tablesIn(sql)) {
			assert.equal(table, GUEST_WORKSPACE_TABLE, `statement reached ${table}: ${sql}`);
		}
	}
	spy.close();
});

test('a table name supplied through any request channel is ignored', async () => {
	const spy = spyOn(createTestDatabase());
	const context = await contextFor(spy.db);
	const login = await send(context, 'POST', GUEST_LOGIN_PATH, { body: { username: 'guest', password: 'guest' } });
	const cookie = login!.headers.get('set-cookie')!.split(';')[0];

	const attempts: Array<{ label: string; path: string; headers?: Record<string, string>; body?: unknown }> = [
		{ label: 'query ?table', path: `${GUEST_WORKSPACE_PATH}?table=sqlite_master` },
		{ label: 'query ?tableName', path: `${GUEST_WORKSPACE_PATH}?tableName=guest_workspace_records2` },
		{ label: 'header x-table-name', path: GUEST_WORKSPACE_PATH, headers: { 'x-table-name': 'sqlite_master' } },
		{ label: 'header x-sql', path: GUEST_WORKSPACE_PATH, headers: { 'x-sql': 'SELECT * FROM sqlite_master' } },
	];

	for (const attempt of attempts) {
		spy.statements.length = 0;
		const response = await send(context, 'GET', attempt.path, { cookie, headers: attempt.headers });
		assert.equal(response!.status, 200, `${attempt.label}: request should behave normally`);
		for (const sql of spy.statements) {
			for (const table of tablesIn(sql)) {
				assert.equal(table, GUEST_WORKSPACE_TABLE, `${attempt.label} reached ${table}`);
			}
		}
	}

	// And through the body on a write.
	spy.statements.length = 0;
	await send(context, 'PUT', GUEST_WORKSPACE_PATH, {
		cookie,
		body: { datasetId: 'd', payload: 'p', table: 'sqlite_master', sql: 'DROP TABLE guest_workspace_records' },
	});
	for (const sql of spy.statements) {
		for (const table of tablesIn(sql)) {
			assert.equal(table, GUEST_WORKSPACE_TABLE, `body-supplied table reached ${table}`);
		}
	}
	spy.close();
});

test('no request produces DDL — no CREATE, DROP or ALTER reaches the database', async () => {
	const spy = spyOn(createTestDatabase());
	const context = await contextFor(spy.db);
	const login = await send(context, 'POST', GUEST_LOGIN_PATH, { body: { username: 'guest', password: 'guest' } });
	const cookie = login!.headers.get('set-cookie')!.split(';')[0];

	await send(context, 'PUT', GUEST_WORKSPACE_PATH, { cookie, body: { datasetId: 'd', payload: 'p' } });
	await send(context, 'DELETE', GUEST_WORKSPACE_PATH, { cookie });

	for (const sql of spy.statements) {
		assert.doesNotMatch(sql, /\b(CREATE|DROP|ALTER|ATTACH|PRAGMA)\b/i, `DDL reached the database: ${sql}`);
	}
	spy.close();
});

// ---- C. dataset id ----

test('a dataset id is only ever a bound value — it never becomes SQL', async () => {
	const spy = spyOn(createTestDatabase());
	const context = await contextFor(spy.db);
	const login = await send(context, 'POST', GUEST_LOGIN_PATH, { body: { username: 'guest', password: 'guest' } });
	const cookie = login!.headers.get('set-cookie')!.split(';')[0];

	const hostile = [
		"d'; DROP TABLE guest_workspace_records; --",
		'guest_workspace_records',
		'../../etc/passwd',
		'sqlite_master',
		'd UNION SELECT name FROM sqlite_master',
	];

	// Baseline: the SQL a perfectly ordinary dataset id produces.
	spy.statements.length = 0;
	await send(context, 'PUT', GUEST_WORKSPACE_PATH, { cookie, body: { datasetId: 'benign', payload: 'p' } });
	const baseline = [...spy.statements];
	assert.ok(baseline.length > 0);

	for (const datasetId of hostile) {
		spy.statements.length = 0;
		const response = await send(context, 'PUT', GUEST_WORKSPACE_PATH, { cookie, body: { datasetId, payload: 'p' } });

		// The property that actually matters: the SQL text does not vary with
		// the dataset id. Either the id was rejected by its shape (no SQL at
		// all), or it was accepted and bound — in which case the statements
		// are byte-identical to the benign ones. A value that reached the SQL
		// would necessarily differ here.
		if (spy.statements.length > 0) {
			assert.deepEqual(spy.statements, baseline, `SQL changed for dataset id ${datasetId}`);
		}
		assert.ok([200, 400].includes(response!.status));
	}

	// The table survives every attempt.
	const read = await send(context, 'GET', GUEST_WORKSPACE_PATH, { cookie });
	assert.equal(read!.status, 200);
	spy.close();
});

test('a dataset id that looks like a table name is stored as data, not acted on', async () => {
	const db = createTestDatabase();
	const context = await contextFor(db);
	const login = await send(context, 'POST', GUEST_LOGIN_PATH, { body: { username: 'guest', password: 'guest' } });
	const cookie = login!.headers.get('set-cookie')!.split(';')[0];

	await send(context, 'PUT', GUEST_WORKSPACE_PATH, {
		cookie,
		body: { datasetId: 'sqlite_master', payload: 'inert' },
	});
	const read = await (await send(context, 'GET', GUEST_WORKSPACE_PATH, { cookie }))!.json();
	assert.equal(read.datasets[0].datasetId, 'sqlite_master');
	assert.equal(read.datasets[0].payload, 'inert', 'it is a row label and nothing more');
	assert.equal(db.totalRows(), 1);
	db.close();
});

// ---- A. unrelated routes gain nothing ----

test('an authenticated cookie unlocks no route other than the guest workspace ones', async () => {
	const spy = spyOn(createTestDatabase());
	const context = await contextFor(spy.db);
	const login = await send(context, 'POST', GUEST_LOGIN_PATH, { body: { username: 'guest', password: 'guest' } });
	const cookie = login!.headers.get('set-cookie')!.split(';')[0];

	const unrelated = [
		'/api/db',
		'/api/db/query',
		'/api/guest',
		'/api/guest/workspace/all',
		'/api/guest/admin',
		'/api/admin',
		'/api/guest/workspace2',
		'/api/sql',
	];

	for (const path of unrelated) {
		spy.statements.length = 0;
		const response = await send(context, 'GET', path, { cookie });
		assert.equal(response, null, `${path} must not be handled by the guest router`);
		assert.deepEqual(spy.statements, [], `${path} reached the database`);
	}
	spy.close();
});

test('the guest router claims exactly four paths', async () => {
	const db = createTestDatabase();
	const context = await contextFor(db);
	const claimed: string[] = [];
	for (const path of [GUEST_WORKSPACE_PATH, GUEST_LOGIN_PATH, GUEST_LOGOUT_PATH, GUEST_SESSION_PATH]) {
		assert.notEqual(await send(context, 'GET', path), null, `${path} must be handled`);
		claimed.push(path);
	}
	assert.deepEqual(claimed.sort(), [
		'/api/guest/login',
		'/api/guest/logout',
		'/api/guest/session',
		'/api/guest/workspace',
	]);
	db.close();
});

// ---- D. the lock did not weaken row ownership ----

test('table lock leaves auth/anon namespace separation intact', async () => {
	const db = createTestDatabase();
	const context = await contextFor(db);

	const login = await send(context, 'POST', GUEST_LOGIN_PATH, { body: { username: 'guest', password: 'guest' } });
	const authCookie = login!.headers.get('set-cookie')!.split(';')[0];
	await send(context, 'PUT', GUEST_WORKSPACE_PATH, { cookie: authCookie, body: { datasetId: 'd', payload: 'auth' } });

	// Strip the signature and replay the bare id as an anonymous cookie.
	const bareId = authCookie.slice(AUTH_COOKIE_NAME.length + 1).split('.')[0];
	const stripped = await (await send(context, 'GET', GUEST_WORKSPACE_PATH, { cookie: `wtlab_guest=${bareId}` }))!.json();
	assert.deepEqual(stripped.datasets, [], 'an unsigned id must not reach the signed workspace');

	// The authenticated session still has its own row.
	const own = await (await send(context, 'GET', GUEST_WORKSPACE_PATH, { cookie: authCookie }))!.json();
	assert.equal(own.datasets[0].payload, 'auth');
	db.close();
});

test('two authenticated sessions still cannot read each other after the lock', async () => {
	const db = createTestDatabase();
	const context = await contextFor(db);

	const a = (await send(context, 'POST', GUEST_LOGIN_PATH, { body: { username: 'guest', password: 'guest' } }))!
		.headers.get('set-cookie')!
		.split(';')[0];
	const b = (await send(context, 'POST', GUEST_LOGIN_PATH, { body: { username: 'guest', password: 'guest' } }))!
		.headers.get('set-cookie')!
		.split(';')[0];

	await send(context, 'PUT', GUEST_WORKSPACE_PATH, { cookie: a, body: { datasetId: 'd', payload: 'A' } });
	await send(context, 'PUT', GUEST_WORKSPACE_PATH, { cookie: b, body: { datasetId: 'd', payload: 'B' } });

	assert.equal((await (await send(context, 'GET', GUEST_WORKSPACE_PATH, { cookie: a }))!.json()).datasets[0].payload, 'A');
	assert.equal((await (await send(context, 'GET', GUEST_WORKSPACE_PATH, { cookie: b }))!.json()).datasets[0].payload, 'B');

	// Logout clears only the caller's rows.
	await send(context, 'POST', GUEST_LOGOUT_PATH, { cookie: a });
	assert.equal((await (await send(context, 'GET', GUEST_WORKSPACE_PATH, { cookie: b }))!.json()).datasets.length, 1);
	assert.equal(db.totalRows(), 1);
	db.close();
});

// ---- login scope ----

test('a successful login returns an identity and nothing resembling an account', async () => {
	const db = createTestDatabase();
	const context = await contextFor(db);
	const response = await send(context, 'POST', GUEST_LOGIN_PATH, { body: { username: 'guest', password: 'guest' } });
	const body = await response!.json();

	assert.deepEqual(Object.keys(body), ['authenticated']);
	for (const field of ['userId', 'memberId', 'role', 'roles', 'permissions', 'profile', 'subscription', 'plan']) {
		assert.equal(field in body, false, `${field} must not exist in a prototype login response`);
	}
	db.close();
});

test('login creates no row anywhere — an identity is not an account', async () => {
	const spy = spyOn(createTestDatabase());
	const context = await contextFor(spy.db);

	await send(context, 'POST', GUEST_LOGIN_PATH, { body: { username: 'guest', password: 'guest' } });

	assert.deepEqual(spy.statements, [], 'logging in must not write to the database');
	assert.equal(spy.totalRows(), 0);
	spy.close();
});
