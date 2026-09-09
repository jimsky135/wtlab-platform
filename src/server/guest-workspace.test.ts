// Storage-level isolation, executed against the real SQL and the real
// migration via node:sqlite (see test-support/sqlite-adapter.ts).

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	clearWorkspace,
	countDatasets,
	deleteInactiveBefore,
	isDatasetId,
	listDatasets,
	putDataset,
	touchWorkspace,
} from './guest-workspace.ts';
import { createTestDatabase } from './test-support/sqlite-adapter.ts';

const A = 'a'.repeat(64);
const B = 'b'.repeat(64);

test('a dataset is stored and read back for the session that wrote it', async () => {
	const db = createTestDatabase();
	await putDataset(db, A, 'notes', '{"n":1}', '2026-09-09T00:00:00.000Z');

	const datasets = await listDatasets(db, A);
	assert.equal(datasets.length, 1);
	assert.deepEqual(datasets[0], {
		datasetId: 'notes',
		payload: '{"n":1}',
		createdAt: '2026-09-09T00:00:00.000Z',
		updatedAt: '2026-09-09T00:00:00.000Z',
	});
	db.close();
});

test('two sessions writing the same dataset id do not collide', async () => {
	const db = createTestDatabase();
	await putDataset(db, A, 'shared-name', 'A payload', '2026-09-09T00:00:00.000Z');
	await putDataset(db, B, 'shared-name', 'B payload', '2026-09-09T00:00:00.000Z');

	assert.equal((await listDatasets(db, A))[0].payload, 'A payload');
	assert.equal((await listDatasets(db, B))[0].payload, 'B payload');
	assert.equal(db.totalRows(), 2, 'both rows coexist in the one fixed table');
	db.close();
});

test('a session reads only its own rows', async () => {
	const db = createTestDatabase();
	await putDataset(db, A, 'a1', 'A', '2026-09-09T00:00:00.000Z');
	await putDataset(db, A, 'a2', 'A', '2026-09-09T00:00:00.000Z');
	await putDataset(db, B, 'b1', 'B', '2026-09-09T00:00:00.000Z');

	assert.deepEqual((await listDatasets(db, A)).map((d) => d.datasetId), ['a1', 'a2']);
	assert.deepEqual((await listDatasets(db, B)).map((d) => d.datasetId), ['b1']);
	assert.equal(await countDatasets(db, A), 2);
	assert.equal(await countDatasets(db, B), 1);
	db.close();
});

test('an update keeps the original created_at and moves only updated_at', async () => {
	const db = createTestDatabase();
	await putDataset(db, A, 'notes', 'first', '2026-09-09T00:00:00.000Z');
	await putDataset(db, A, 'notes', 'second', '2026-09-09T06:00:00.000Z');

	const [dataset] = await listDatasets(db, A);
	assert.equal(dataset.payload, 'second');
	assert.equal(dataset.createdAt, '2026-09-09T00:00:00.000Z');
	assert.equal(dataset.updatedAt, '2026-09-09T06:00:00.000Z');
	assert.equal(db.totalRows(), 1, 'an update must not create a second row');
	db.close();
});

test('clearing one workspace leaves every other session untouched', async () => {
	const db = createTestDatabase();
	await putDataset(db, A, 'a1', 'A', '2026-09-09T00:00:00.000Z');
	await putDataset(db, B, 'b1', 'B', '2026-09-09T00:00:00.000Z');

	await clearWorkspace(db, A);

	assert.deepEqual(await listDatasets(db, A), []);
	assert.equal((await listDatasets(db, B)).length, 1, "B's rows survive A clearing");
	db.close();
});

test('the inactivity sweep removes idle rows and spares an active session', async () => {
	const db = createTestDatabase();
	await putDataset(db, A, 'idle', 'A', '2026-09-01T00:00:00.000Z');
	await putDataset(db, B, 'active', 'B', '2026-09-01T00:00:00.000Z');

	// B is still working.
	await touchWorkspace(db, B, '2026-09-09T12:00:00.000Z');

	await deleteInactiveBefore(db, '2026-09-08T00:00:00.000Z');

	assert.deepEqual(await listDatasets(db, A), [], 'idle session swept');
	assert.equal((await listDatasets(db, B)).length, 1, 'active session must never be swept');
	db.close();
});

test('the sweep deletes rows only — the fixed table remains', async () => {
	const db = createTestDatabase();
	await putDataset(db, A, 'old', 'A', '2026-09-01T00:00:00.000Z');
	await deleteInactiveBefore(db, '2026-09-09T00:00:00.000Z');

	assert.equal(db.totalRows(), 0);
	// The table still answers queries, so it was not dropped.
	assert.deepEqual(await listDatasets(db, A), []);
	await putDataset(db, A, 'new', 'A', '2026-09-09T00:00:00.000Z');
	assert.equal((await listDatasets(db, A)).length, 1);
	db.close();
});

test('dataset ids are restricted to a safe shape', () => {
	for (const good of ['notes', 'water-level', 'a_1', 'A'.repeat(64)]) {
		assert.equal(isDatasetId(good), true, `rejected ${good}`);
	}
	for (const bad of ['', ' ', 'a'.repeat(65), 'drop table', "a'b", '../x', 'a;b']) {
		assert.equal(isDatasetId(bad), false, `accepted ${bad}`);
	}
});
