import assert from 'node:assert/strict';
import { test } from 'node:test';
import writeXlsxFile from 'write-excel-file/node';
import { buildSheetData, deriveOutputFilename } from './export-xlsx.ts';
import { applyFixedTransformations } from './transform.ts';
import type { ParsedTable } from './types.ts';

const table: ParsedTable = {
	headers: ['物料號碼', '未限制庫存', '檢驗中庫存', '廠內庫存可用月數'],
	rows: [['130901000000', '97.23', '0', '      4.6']],
};

test('buildSheetData puts the header row first, then one row per data row, matching column order', () => {
	const result = applyFixedTransformations(table);
	const sheet = buildSheetData(result);
	assert.deepEqual(sheet[0], result.headers);
	assert.deepEqual(sheet[1], result.rows[0]);
	assert.equal(sheet.length, 2);
});

test('the sheet data produces a real, non-empty .xlsx buffer via write-excel-file', async () => {
	const result = applyFixedTransformations(table);
	const sheet = buildSheetData(result);
	const buffer = await writeXlsxFile(sheet).toBuffer();
	assert.ok(buffer.length > 0);
	// .xlsx is a ZIP container — every valid one starts with the ZIP local-file-header magic bytes.
	assert.equal(buffer.subarray(0, 2).toString('latin1'), 'PK');
});

test('deriveOutputFilename swaps the mhtml/htm extension for .xlsx', () => {
	assert.equal(deriveOutputFilename('202604-inventory.mhtml'), '202604-inventory.xlsx');
	assert.equal(deriveOutputFilename('report.MHT'), 'report.xlsx');
	assert.equal(deriveOutputFilename('export.htm'), 'export.xlsx');
	assert.equal(deriveOutputFilename('no-extension'), 'no-extension.xlsx');
});
