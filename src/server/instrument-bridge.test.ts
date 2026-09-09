// Data Bridge v0.2 — all seven instruments over one workspace transport.
//
// The point of these tests is that the tools stay different. Each writes the
// ConfirmedIntake its OWN intake path produces, under its OWN schema id, and
// the shared fixed table holds them side by side without flattening the
// granularity differences (item snapshot / arrival event / supplier
// aggregate / seven statistical windows).

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { confirmIntake } from '../platform/intake/confirm.ts';
import type { ConfirmedIntake, IntakeSchema, RawIntakeRecord } from '../platform/intake/types.ts';
import { validateRecords } from '../platform/intake/validate.ts';
import { arrivalQuickSchema } from '../tools/arrival-collision-detector/modes/quick/schema.ts';
import { bufferDriftQuickSchema } from '../tools/buffer-drift-monitor/modes/quick/schema.ts';
import { deadStockQuickSchema } from '../tools/dead-stock-scanner/modes/quick/schema.ts';
import { demandWaveSchema } from '../tools/demand-wave-radar/schema.ts';
import { quickIntakeSchema } from '../tools/inventory-buffer-check/modes/quick/schema.ts';
import { leadTimeGapQuickSchema } from '../tools/lead-time-gap-checker/modes/quick/schema.ts';
import { supplierDependencyQuickSchema } from '../tools/supplier-dependency-radar/modes/quick/schema.ts';
import { sha256Hex } from './prototype-login.ts';
import { GUEST_LOGIN_PATH, GUEST_LOGOUT_PATH, GUEST_WORKSPACE_PATH, routeGuestApi, type RouterContext } from './router.ts';
import { createTestDatabase, type TestDatabase } from './test-support/sqlite-adapter.ts';

const ORIGIN = 'https://www.wtlab.co';
const SECRET = 'test-secret-not-a-real-key';

/** Every connected instrument, with values deliberately unlike its demo. */
const CONNECTED: Array<{
	instrument: string;
	schema: IntakeSchema;
	granularity: string;
	values: () => Record<string, string>;
}> = [
	{
		instrument: 'inventory-buffer-check',
		schema: quickIntakeSchema,
		granularity: 'item snapshot',
		values: () => ({
			itemName: 'WL-real',
			currentStock: '480',
			monthlyConsumption: '40',
			leadTimeMonths: '3',
			safetyBufferMonths: '2',
		}),
	},
	{
		instrument: 'arrival-collision-detector',
		schema: arrivalQuickSchema,
		granularity: 'arrival event',
		values: () => ({ arrivalDate: '2026-11-04', quantity: '750', container: 'C-99', supplier: 'supplier-z' }),
	},
	{
		instrument: 'dead-stock-scanner',
		schema: deadStockQuickSchema,
		granularity: 'item snapshot',
		values: () => ({
			item: 'DS-real',
			currentStock: '1500',
			recentMonthlyConsumption: '5',
			monthsSinceLastMovement: '9',
			futureDemand: '0',
			unitCost: '7.25',
		}),
	},
	{
		instrument: 'lead-time-gap-checker',
		schema: leadTimeGapQuickSchema,
		granularity: 'item snapshot',
		values: () => ({
			itemName: 'LT-real',
			currentStock: '60',
			monthlyConsumption: '30',
			leadTimeMonths: '2.5',
			safetyBufferMonths: '1',
		}),
	},
	{
		instrument: 'buffer-drift-monitor',
		schema: bufferDriftQuickSchema,
		granularity: 'item snapshot',
		values: () => ({
			itemName: 'BD-real',
			monthlyConsumption: '55',
			intendedBufferMonths: '2',
			actualBufferQuantity: '44',
		}),
	},
	{
		instrument: 'supplier-dependency-radar',
		schema: supplierDependencyQuickSchema,
		granularity: 'supplier aggregate',
		values: () => ({
			supplierName: 'SD-real',
			materialCount: '12',
			criticalMaterialCount: '4',
			supplierSharePercent: '85',
			singleSourceMaterialCount: '5',
			qualifiedSingleSourceMaterialCount: '2',
		}),
	},
	{
		instrument: 'demand-wave-radar',
		schema: demandWaveSchema,
		granularity: 'item × seven windows',
		values: () => ({ itemName: 'DW-real', annual: '200', h1: '150', h2: '250', q3: '320' }),
	},
];

async function contextFor(db: TestDatabase): Promise<RouterContext> {
	return {
		db,
		now: () => new Date('2026-09-09T00:00:00.000Z'),
		secureCookies: true,
		login: { username: 'guest', passwordSha256: await sha256Hex('guest'), sessionSecret: SECRET },
	};
}

function confirmFor(schema: IntakeSchema, values: Record<string, string>): ConfirmedIntake {
	const record: RawIntakeRecord = { values, unknown: {} };
	const result = validateRecords([record], schema);
	assert.equal(result.errorCount, 0, `${schema.id} fixture must be valid: ${JSON.stringify(result.issues)}`);
	const outcome = confirmIntake(schema, result);
	assert.ok(outcome.confirmed);
	return outcome.data;
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
		save: (datasetId: string, confirmed: ConfirmedIntake) =>
			send('PUT', GUEST_WORKSPACE_PATH, { datasetId, payload: JSON.stringify(confirmed) }),
		read: () => send('GET', GUEST_WORKSPACE_PATH),
		clear: () => send('DELETE', GUEST_WORKSPACE_PATH),
	};
}

function stored(json: any, datasetId: string): ConfirmedIntake | null {
	const dataset = json.datasets.find((d: any) => d.datasetId === datasetId);
	return dataset ? (JSON.parse(dataset.payload) as ConfirmedIntake) : null;
}

// ---- dataset identity ----

test('every dataset id is the instrument own existing schema id', () => {
	assert.deepEqual(
		CONNECTED.map((tool) => tool.schema.id),
		[
			'water-level-quick',
			'arrival-collision-quick',
			'dead-stock-quick',
			'lead-time-gap-quick',
			'buffer-drift-quick',
			'supplier-dependency-quick',
			'demand-wave',
		]
	);
});

test('the seven dataset ids are distinct', () => {
	assert.equal(new Set(CONNECTED.map((tool) => tool.schema.id)).size, CONNECTED.length);
});

// ---- per-instrument round trip ----

for (const tool of CONNECTED) {
	test(`${tool.instrument}: working data is stored and read back unchanged`, async () => {
		const db = createTestDatabase();
		const browser = createBrowser(await contextFor(db));
		await browser.login();

		const confirmed = confirmFor(tool.schema, tool.values());
		await browser.save(tool.schema.id, confirmed);

		const back = stored((await browser.read()).json, tool.schema.id);
		assert.ok(back, `${tool.instrument} dataset missing`);
		assert.equal(back.schemaId, tool.schema.id, 'the payload keeps its own schema identity');
		assert.deepEqual(back.records, JSON.parse(JSON.stringify(confirmed.records)));
		db.close();
	});

	test(`${tool.instrument}: every stored key is one of its own input fields`, async () => {
		const db = createTestDatabase();
		const browser = createBrowser(await contextFor(db));
		await browser.login();
		await browser.save(tool.schema.id, confirmFor(tool.schema, tool.values()));

		const back = stored((await browser.read()).json, tool.schema.id)!;
		const own = new Set(tool.schema.fields.map((field) => field.id));
		for (const key of Object.keys(back.records[0])) {
			assert.ok(own.has(key), `${key} does not belong to ${tool.instrument}`);
		}
		db.close();
	});

	test(`${tool.instrument}: re-running upserts rather than accumulating`, async () => {
		const db = createTestDatabase();
		const browser = createBrowser(await contextFor(db));
		await browser.login();

		await browser.save(tool.schema.id, confirmFor(tool.schema, tool.values()));
		await browser.save(tool.schema.id, confirmFor(tool.schema, tool.values()));
		await browser.save(tool.schema.id, confirmFor(tool.schema, tool.values()));

		assert.equal((await browser.read()).json.datasets.length, 1);
		assert.equal(db.totalRows(), 1, 'workspace is current state, not history');
		db.close();
	});
}

// ---- Phase 9: the main claim ----

test('one session holds all seven datasets side by side without collision', async () => {
	const db = createTestDatabase();
	const browser = createBrowser(await contextFor(db));
	await browser.login();

	for (const tool of CONNECTED) {
		await browser.save(tool.schema.id, confirmFor(tool.schema, tool.values()));
	}

	const read = (await browser.read()).json;
	assert.equal(read.datasets.length, CONNECTED.length, 'every instrument keeps its own dataset');
	assert.equal(db.totalRows(), CONNECTED.length, 'one fixed table, one row per dataset');

	// Each dataset still carries its own vocabulary — nothing was flattened.
	for (const tool of CONNECTED) {
		const back = stored(read, tool.schema.id);
		assert.ok(back, `${tool.instrument} missing`);
		assert.equal(back.schemaId, tool.schema.id);
	}

	// Granularity survives: an arrival event and a seven-window record do not
	// look like each other after the round trip.
	const arrival = stored(read, arrivalQuickSchema.id)!.records[0];
	const wave = stored(read, demandWaveSchema.id)!.records[0];
	assert.equal(arrival.arrivalDate, '2026-11-04');
	assert.equal(arrival.quantity, 750);
	assert.equal(wave.q3, 320);
	assert.equal('quantity' in wave, false, 'a window record must not gain arrival fields');
	assert.equal('q3' in arrival, false, 'an arrival must not gain window fields');
	db.close();
});

test('writing one instrument never overwrites another', async () => {
	const db = createTestDatabase();
	const browser = createBrowser(await contextFor(db));
	await browser.login();

	await browser.save(quickIntakeSchema.id, confirmFor(quickIntakeSchema, CONNECTED[0].values()));
	const before = stored((await browser.read()).json, quickIntakeSchema.id)!;

	for (const tool of CONNECTED.slice(1)) {
		await browser.save(tool.schema.id, confirmFor(tool.schema, tool.values()));
	}

	const after = stored((await browser.read()).json, quickIntakeSchema.id)!;
	assert.deepEqual(after.records, before.records, 'Water Level data untouched by the other six');
	db.close();
});

// ---- Phase 10 / 11: isolation ----

test('two sessions both signed in as guest keep all seven datasets separate', async () => {
	const db = createTestDatabase();
	const context = await contextFor(db);
	const a = createBrowser(context);
	const b = createBrowser(context);
	await a.login();
	await b.login();

	for (const tool of CONNECTED) {
		await a.save(tool.schema.id, confirmFor(tool.schema, { ...tool.values(), ...aMark(tool.schema) }));
		await b.save(tool.schema.id, confirmFor(tool.schema, { ...tool.values(), ...bMark(tool.schema) }));
	}

	const readA = (await a.read()).json;
	const readB = (await b.read()).json;
	assert.equal(readA.datasets.length, CONNECTED.length);
	assert.equal(readB.datasets.length, CONNECTED.length);
	assert.equal(db.totalRows(), CONNECTED.length * 2, 'both sessions coexist in the fixed table');

	assert.equal(stored(readA, quickIntakeSchema.id)!.records[0].itemName, 'A-item');
	assert.equal(stored(readB, quickIntakeSchema.id)!.records[0].itemName, 'B-item');
	db.close();
});

function aMark(schema: IntakeSchema): Record<string, string> {
	if (schema.fields.some((f) => f.id === 'itemName')) return { itemName: 'A-item' };
	if (schema.fields.some((f) => f.id === 'item')) return { item: 'A-item' };
	if (schema.fields.some((f) => f.id === 'supplierName')) return { supplierName: 'A-supplier' };
	return { container: 'A-container' };
}

function bMark(schema: IntakeSchema): Record<string, string> {
	if (schema.fields.some((f) => f.id === 'itemName')) return { itemName: 'B-item' };
	if (schema.fields.some((f) => f.id === 'item')) return { item: 'B-item' };
	if (schema.fields.some((f) => f.id === 'supplierName')) return { supplierName: 'B-supplier' };
	return { container: 'B-container' };
}

test('an anonymous session and a signed-in session hold separate datasets across granularities', async () => {
	const db = createTestDatabase();
	const context = await contextFor(db);
	const anon = createBrowser(context);
	const auth = createBrowser(context);
	await auth.login();

	// One item-based tool and one event-based tool, as required.
	for (const schema of [quickIntakeSchema, arrivalQuickSchema]) {
		const tool = CONNECTED.find((candidate) => candidate.schema === schema)!;
		await anon.save(schema.id, confirmFor(schema, { ...tool.values(), ...aMark(schema) }));
		await auth.save(schema.id, confirmFor(schema, { ...tool.values(), ...bMark(schema) }));
	}

	assert.equal(stored((await anon.read()).json, quickIntakeSchema.id)!.records[0].itemName, 'A-item');
	assert.equal(stored((await auth.read()).json, quickIntakeSchema.id)!.records[0].itemName, 'B-item');
	assert.equal(stored((await anon.read()).json, arrivalQuickSchema.id)!.records[0].container, 'A-container');
	assert.equal(stored((await auth.read()).json, arrivalQuickSchema.id)!.records[0].container, 'B-container');
	assert.equal(db.totalRows(), 4, 'anon: and auth: namespaces stay separate');
	db.close();
});

// ---- Phase 12: lifecycle ----

test('logout clears every dataset of that session and leaves other sessions intact', async () => {
	const db = createTestDatabase();
	const context = await contextFor(db);
	const a = createBrowser(context);
	const b = createBrowser(context);
	await a.login();
	await b.login();

	for (const tool of CONNECTED) {
		await a.save(tool.schema.id, confirmFor(tool.schema, tool.values()));
		await b.save(tool.schema.id, confirmFor(tool.schema, tool.values()));
	}
	assert.equal(db.totalRows(), CONNECTED.length * 2);

	await a.logout();

	assert.equal(db.totalRows(), CONNECTED.length, 'only A was cleared');
	assert.equal((await b.read()).json.datasets.length, CONNECTED.length, 'B keeps every dataset');

	await a.login();
	assert.deepEqual((await a.read()).json.datasets, [], 're-login starts empty');
	db.close();
});

test('an anonymous clear removes every dataset of that session only', async () => {
	const db = createTestDatabase();
	const context = await contextFor(db);
	const anon = createBrowser(context);
	const other = createBrowser(context);
	await other.login();

	for (const tool of CONNECTED) {
		await anon.save(tool.schema.id, confirmFor(tool.schema, tool.values()));
		await other.save(tool.schema.id, confirmFor(tool.schema, tool.values()));
	}

	await anon.clear();

	assert.deepEqual((await anon.read()).json.datasets, []);
	assert.equal((await other.read()).json.datasets.length, CONNECTED.length);
	db.close();
});
