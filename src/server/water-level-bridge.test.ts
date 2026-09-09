// Data Bridge v0.1 — Water Level Checker ↔ guest workspace.
//
// What these prove is the loop, not the instrument: a ConfirmedIntake
// produced by the real Water Level intake path is stored under the mode's
// own schema id, comes back byte-identical, upserts rather than
// accumulating, and never crosses a session boundary.
//
// Water Level's own validate/calculate are untouched and are not exercised
// here — they have their own tests.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { confirmIntake } from '../platform/intake/confirm.ts';
import type { ConfirmedIntake, RawIntakeRecord } from '../platform/intake/types.ts';
import { validateRecords } from '../platform/intake/validate.ts';
import { quickIntakeSchema } from '../tools/inventory-buffer-check/modes/quick/schema.ts';
import { sha256Hex } from './prototype-login.ts';
import { GUEST_LOGIN_PATH, GUEST_LOGOUT_PATH, GUEST_WORKSPACE_PATH, routeGuestApi, type RouterContext } from './router.ts';
import { createTestDatabase, type TestDatabase } from './test-support/sqlite-adapter.ts';

const ORIGIN = 'https://www.wtlab.co';
const SECRET = 'test-secret-not-a-real-key';

/** The dataset id is the mode's own schema id — no second naming system. */
const WATER_LEVEL_DATASET = quickIntakeSchema.id;

async function contextFor(db: TestDatabase): Promise<RouterContext> {
	return {
		db,
		now: () => new Date('2026-09-09T00:00:00.000Z'),
		secureCookies: true,
		login: { username: 'guest', passwordSha256: await sha256Hex('guest'), sessionSecret: SECRET },
	};
}

/** Runs the real Water Level quick intake path and returns what it confirms. */
function confirmWaterLevel(values: Record<string, string>): ConfirmedIntake {
	const record: RawIntakeRecord = { values, unknown: {} };
	const result = validateRecords([record], quickIntakeSchema);
	assert.equal(result.errorCount, 0, 'fixture must be valid Water Level input');
	const outcome = confirmIntake(quickIntakeSchema, result);
	assert.ok(outcome.confirmed);
	return outcome.data;
}

function waterLevelValues(overrides: Record<string, string> = {}): Record<string, string> {
	return {
		itemName: 'M50',
		currentStock: '480',
		monthlyConsumption: '40',
		leadTimeMonths: '3',
		safetyBufferMonths: '2',
		inTransitQuantity: '',
		arrivalTimeMonths: '',
		...overrides,
	};
}

function createBrowser(context: RouterContext) {
	const jar = new Map<string, string>();

	async function send(method: string, path: string, body?: unknown) {
		const headers = new Headers();
		if (jar.size > 0) headers.set('cookie', Array.from(jar, ([n, v]) => `${n}=${v}`).join('; '));
		if (body !== undefined) headers.set('content-type', 'application/json');

		const response = await routeGuestApi(
			new Request(`${ORIGIN}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }),
			context
		);
		assert.ok(response);
		for (const [header, value] of response.headers) {
			if (header.toLowerCase() !== 'set-cookie') continue;
			const [pair, ...attrs] = value.split(';');
			const eq = pair.indexOf('=');
			const name = pair.slice(0, eq).trim();
			const cookieValue = pair.slice(eq + 1).trim();
			if (attrs.some((a) => a.trim().toLowerCase() === 'max-age=0') || cookieValue === '') jar.delete(name);
			else jar.set(name, cookieValue);
		}
		return { status: response.status, json: (await response.json()) as any };
	}

	return {
		login: () => send('POST', GUEST_LOGIN_PATH, { username: 'guest', password: 'guest' }),
		logout: () => send('POST', GUEST_LOGOUT_PATH),
		saveWaterLevel: (confirmed: ConfirmedIntake) =>
			send('PUT', GUEST_WORKSPACE_PATH, { datasetId: WATER_LEVEL_DATASET, payload: JSON.stringify(confirmed) }),
		read: () => send('GET', GUEST_WORKSPACE_PATH),
		clear: () => send('DELETE', GUEST_WORKSPACE_PATH),
	};
}

function storedWaterLevel(json: any): ConfirmedIntake | null {
	const dataset = json.datasets.find((d: any) => d.datasetId === WATER_LEVEL_DATASET);
	return dataset ? (JSON.parse(dataset.payload) as ConfirmedIntake) : null;
}

// ---- write / read ----

test('the dataset id is the Water Level quick schema id, not a new name', () => {
	assert.equal(WATER_LEVEL_DATASET, 'water-level-quick');
});

test('confirmed Water Level input is stored and read back unchanged', async () => {
	const db = createTestDatabase();
	const browser = createBrowser(await contextFor(db));
	await browser.login();

	const confirmed = confirmWaterLevel(waterLevelValues());
	await browser.saveWaterLevel(confirmed);

	const stored = storedWaterLevel((await browser.read()).json);
	assert.ok(stored);
	assert.equal(stored.schemaId, 'water-level-quick');
	assert.deepEqual(stored.records, JSON.parse(JSON.stringify(confirmed.records)));
	db.close();
});

test('field types survive the round trip — numbers stay numbers, text stays text', async () => {
	const db = createTestDatabase();
	const browser = createBrowser(await contextFor(db));
	await browser.login();

	const confirmed = confirmWaterLevel(waterLevelValues({ currentStock: '480', monthlyConsumption: '40.5' }));
	await browser.saveWaterLevel(confirmed);

	const record = storedWaterLevel((await browser.read()).json)!.records[0];
	assert.equal(typeof record.itemName, 'string');
	assert.equal(record.itemName, 'M50');
	assert.equal(typeof record.currentStock, 'number');
	assert.equal(record.currentStock, 480);
	assert.equal(record.monthlyConsumption, 40.5, 'a decimal must not be rounded or stringified');
	db.close();
});

test('a blank optional field stays absent — it is never coerced to 0 or ""', async () => {
	const db = createTestDatabase();
	const browser = createBrowser(await contextFor(db));
	await browser.login();

	const confirmed = confirmWaterLevel(waterLevelValues({ inTransitQuantity: '' }));
	assert.equal(confirmed.records[0].inTransitQuantity, undefined, 'precondition: blank is undefined');

	await browser.saveWaterLevel(confirmed);
	const record = storedWaterLevel((await browser.read()).json)!.records[0];

	// JSON drops undefined-valued keys, so the field reads back as absent —
	// the same meaning, and specifically NOT 0 or an empty string.
	assert.equal(record.inTransitQuantity, undefined);
	assert.notEqual(record.inTransitQuantity, 0);
	assert.notEqual(record.inTransitQuantity, '');
	db.close();
});

test('what is stored is input, never a calculated result', async () => {
	const db = createTestDatabase();
	const browser = createBrowser(await contextFor(db));
	await browser.login();

	await browser.saveWaterLevel(confirmWaterLevel(waterLevelValues()));
	const stored = storedWaterLevel((await browser.read()).json)!;

	// Every stored key is a Water Level input field. It is a subset, not an
	// exact match, because JSON omits the keys whose value was undefined —
	// the blank optional fields (covered by its own test above).
	const schemaFields = new Set(quickIntakeSchema.fields.map((field) => field.id));
	for (const field of Object.keys(stored.records[0])) {
		assert.ok(schemaFields.has(field), `${field} is not a Water Level input field`);
	}
	for (const resultField of ['coverageMonths', 'riskStatus', 'depletionDate', 'recommendedReorderPoint']) {
		assert.equal(resultField in stored.records[0], false, `${resultField} is a result, not input`);
	}
	db.close();
});

// ---- upsert ----

test('re-running Water Level upserts the same dataset — no duplicate rows', async () => {
	const db = createTestDatabase();
	const browser = createBrowser(await contextFor(db));
	await browser.login();

	await browser.saveWaterLevel(confirmWaterLevel(waterLevelValues({ currentStock: '480' })));
	await browser.saveWaterLevel(confirmWaterLevel(waterLevelValues({ currentStock: '90' })));
	await browser.saveWaterLevel(confirmWaterLevel(waterLevelValues({ currentStock: '12' })));

	const read = (await browser.read()).json;
	assert.equal(read.datasets.length, 1, 'one current Water Level dataset per session');
	assert.equal(db.totalRows(), 1, 'no duplicate rows accumulate');
	assert.equal(storedWaterLevel(read)!.records[0].currentStock, 12, 'latest values win');
	db.close();
});

// ---- isolation ----

test('two guests both signed in as guest keep separate Water Level datasets', async () => {
	const db = createTestDatabase();
	const context = await contextFor(db);
	const a = createBrowser(context);
	const b = createBrowser(context);
	await a.login();
	await b.login();

	await a.saveWaterLevel(confirmWaterLevel(waterLevelValues({ itemName: 'A-item', currentStock: '111' })));
	await b.saveWaterLevel(confirmWaterLevel(waterLevelValues({ itemName: 'B-item', currentStock: '222' })));

	assert.equal(storedWaterLevel((await a.read()).json)!.records[0].itemName, 'A-item');
	assert.equal(storedWaterLevel((await b.read()).json)!.records[0].itemName, 'B-item');
	assert.equal(db.totalRows(), 2);
	db.close();
});

test('an anonymous guest and a signed-in guest do not share a Water Level dataset', async () => {
	const db = createTestDatabase();
	const context = await contextFor(db);
	const anon = createBrowser(context);
	const signedIn = createBrowser(context);
	await signedIn.login();

	await anon.saveWaterLevel(confirmWaterLevel(waterLevelValues({ itemName: 'anon-item' })));
	await signedIn.saveWaterLevel(confirmWaterLevel(waterLevelValues({ itemName: 'auth-item' })));

	assert.equal(storedWaterLevel((await anon.read()).json)!.records[0].itemName, 'anon-item');
	assert.equal(storedWaterLevel((await signedIn.read()).json)!.records[0].itemName, 'auth-item');
	assert.equal(db.totalRows(), 2, 'auth: and anon: namespaces hold separate rows');
	db.close();
});

test('one session cannot overwrite another session Water Level dataset', async () => {
	const db = createTestDatabase();
	const context = await contextFor(db);
	const a = createBrowser(context);
	const b = createBrowser(context);
	await a.login();
	await b.login();

	await b.saveWaterLevel(confirmWaterLevel(waterLevelValues({ itemName: 'B-original' })));
	// A writes the very same dataset id.
	await a.saveWaterLevel(confirmWaterLevel(waterLevelValues({ itemName: 'A-attempt' })));

	assert.equal(storedWaterLevel((await b.read()).json)!.records[0].itemName, 'B-original');
	db.close();
});

// ---- lifecycle ----

test('logout removes the Water Level dataset and re-login starts empty', async () => {
	const db = createTestDatabase();
	const browser = createBrowser(await contextFor(db));
	await browser.login();
	await browser.saveWaterLevel(confirmWaterLevel(waterLevelValues()));
	assert.ok(storedWaterLevel((await browser.read()).json));

	await browser.logout();
	assert.equal(db.totalRows(), 0);

	await browser.login();
	assert.equal(storedWaterLevel((await browser.read()).json), null, 'no stale working data after re-login');
	db.close();
});

test('an anonymous guest clearing the workspace cannot read the dataset back', async () => {
	const db = createTestDatabase();
	const browser = createBrowser(await contextFor(db));
	await browser.saveWaterLevel(confirmWaterLevel(waterLevelValues()));
	assert.ok(storedWaterLevel((await browser.read()).json));

	await browser.clear();
	assert.equal(storedWaterLevel((await browser.read()).json), null);
	db.close();
});
