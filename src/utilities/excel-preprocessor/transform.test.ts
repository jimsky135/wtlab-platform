import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyFixedTransformations } from './transform.ts';
import type { ParsedTable } from './types.ts';

// Header order mirrors 原料庫存.xlsx (the confirmed target Excel Template)
// minus the analyst's own manually-inserted blank total column — i.e. the
// inferred raw SAP export shape (see Sprint 010B completion report: real
// raw-file validation is still pending).
function fixtureTable(overrides: Partial<ParsedTable> = {}): ParsedTable {
	return {
		headers: [
			'物料類型',
			'類型說明',
			'物料號碼',
			'工廠',
			'原料名稱',
			'基礎計量單位',
			'安全庫存(主檔)',
			'未限制庫存',
			'檢驗中庫存',
			'預計採購量(請購)',
			'未交採購量',
			'工單未發量',
			'需求量',
			'202501 ～202506平均用量',
			'202507 ～202512平均用量',
			'202504 ～202604平均用量',
			'廠內庫存可用月數',
			'總庫存可用月數',
		],
		rows: [
			['Z901', '高鋁質', '130901000000', '1320', 'AWA（大．韓）白鋼玉5-3', 'TO', '80', '97.23', '0', '40', '0', '32.018', '14.788', '20.955', '12.979', '12.66', '      4.6', '      6.5'],
		],
		...overrides,
	};
}

test('inserts 總庫存 = 未限制庫存 + 檢驗中庫存 right after 檢驗中庫存, with a blank header', () => {
	const result = applyFixedTransformations(fixtureTable());
	const inQualityIndex = result.headers.indexOf('檢驗中庫存');
	assert.equal(result.headers[inQualityIndex + 1], '', 'the new total column must have a blank header to match the existing manual template');
	assert.equal(result.rows[0][inQualityIndex + 1], 97.23);
});

test('every other column keeps its original order and values untouched', () => {
	const table = fixtureTable();
	const result = applyFixedTransformations(table);
	// Headers before the insertion point are identical; headers after are shifted by exactly one.
	const insertAt = table.headers.indexOf('檢驗中庫存') + 1;
	assert.deepEqual(result.headers.slice(0, insertAt), table.headers.slice(0, insertAt));
	assert.deepEqual(result.headers.slice(insertAt + 1), table.headers.slice(insertAt));
});

test('廠內庫存可用月數 / 總庫存可用月數 are parsed from padded text to real numbers', () => {
	const result = applyFixedTransformations(fixtureTable());
	const monthsIndex = result.headers.indexOf('廠內庫存可用月數');
	const totalMonthsIndex = result.headers.indexOf('總庫存可用月數');
	assert.equal(result.rows[0][monthsIndex], 4.6);
	assert.equal(typeof result.rows[0][monthsIndex], 'number');
	assert.equal(result.rows[0][totalMonthsIndex], 6.5);
	assert.deepEqual(result.summary.monthsColumnsCleaned, ['廠內庫存可用月數', '總庫存可用月數']);
});

test('missing required columns is a blocking error — no output rows are guessed', () => {
	const table = fixtureTable({ headers: fixtureTable().headers.filter((h) => h !== '檢驗中庫存') });
	table.rows = [table.rows[0].filter((_, i) => i !== fixtureTable().headers.indexOf('檢驗中庫存'))];
	const result = applyFixedTransformations(table);
	assert.equal(result.rows.length, 0);
	assert.ok(result.issues.some((issue) => issue.severity === 'error' && issue.message.includes('檢驗中庫存')));
});

test('missing optional months columns is a warning, not a blocking error', () => {
	const table = fixtureTable();
	const monthsIndexes = [table.headers.indexOf('廠內庫存可用月數'), table.headers.indexOf('總庫存可用月數')];
	table.headers = table.headers.filter((_, i) => !monthsIndexes.includes(i));
	table.rows = table.rows.map((row) => row.filter((_, i) => !monthsIndexes.includes(i)));

	const result = applyFixedTransformations(table);
	assert.equal(result.rows.length, 1, 'the row is still processed');
	assert.ok(result.issues.some((issue) => issue.severity === 'warning'));
	assert.ok(!result.issues.some((issue) => issue.severity === 'error'));
});

test('a row with a non-numeric 未限制庫存/檢驗中庫存 is excluded with a blocking error, not defaulted to 0', () => {
	const table = fixtureTable();
	table.rows.push([...table.rows[0]]);
	const badRow = table.rows[1];
	badRow[table.headers.indexOf('未限制庫存')] = 'n/a';

	const result = applyFixedTransformations(table);
	assert.equal(result.summary.rowCount, 1);
	assert.equal(result.summary.excludedRowCount, 1);
	assert.ok(result.issues.some((issue) => issue.severity === 'error' && issue.row === 2));
});

test('an unparseable available-months value is left as text with a warning, not silently zeroed', () => {
	const table = fixtureTable();
	table.rows[0][table.headers.indexOf('廠內庫存可用月數')] = 'N/A';
	const result = applyFixedTransformations(table);
	const monthsIndex = table.headers.indexOf('廠內庫存可用月數') + 1; // shifted by the inserted total column
	assert.equal(result.rows[0][monthsIndex], 'N/A');
	assert.ok(result.issues.some((issue) => issue.severity === 'warning' && issue.column === '廠內庫存可用月數'));
});

test('processing the same table twice produces identical results (deterministic, no hidden state)', () => {
	const table = fixtureTable();
	assert.deepEqual(applyFixedTransformations(table), applyFixedTransformations(table));
});
