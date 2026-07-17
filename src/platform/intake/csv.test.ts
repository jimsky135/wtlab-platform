import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCsv } from './csv.ts';

test('parses headers and rows from well-formed CSV', () => {
	const result = parseCsv('name,qty\nWidget,5\nBolt,12\n');
	assert.equal(result.ok, true);
	assert.deepEqual(result.headers, ['name', 'qty']);
	assert.deepEqual(result.rows, [
		['Widget', '5'],
		['Bolt', '12'],
	]);
	assert.equal(result.issues.length, 0);
});

test('handles quoted fields with commas and escaped quotes', () => {
	const result = parseCsv('name,note\n"Widget, large","said ""ok"""\n');
	assert.equal(result.ok, true);
	assert.deepEqual(result.rows, [['Widget, large', 'said "ok"']]);
});

test('handles CRLF line endings', () => {
	const result = parseCsv('name,qty\r\nWidget,5\r\n');
	assert.equal(result.ok, true);
	assert.deepEqual(result.rows, [['Widget', '5']]);
});

test('empty file is an error', () => {
	const result = parseCsv('   \n  ');
	assert.equal(result.ok, false);
	assert.ok(result.issues.some((issue) => issue.severity === 'error' && issue.message.includes('empty')));
});

test('headers with no data rows is an error', () => {
	const result = parseCsv('name,qty\n');
	assert.equal(result.ok, false);
	assert.ok(result.issues.some((issue) => issue.severity === 'error' && issue.message.includes('no data rows')));
});

test('duplicate headers are reported as errors', () => {
	const result = parseCsv('name,name\nWidget,Bolt\n');
	assert.equal(result.ok, false);
	assert.ok(
		result.issues.some((issue) => issue.severity === 'error' && issue.message.includes('Duplicate column header'))
	);
});

test('inconsistent row lengths are kept and flagged as warnings', () => {
	const result = parseCsv('name,qty\nWidget,5,extra\nBolt\n');
	assert.equal(result.ok, true);
	assert.equal(result.rows.length, 2);
	const warnings = result.issues.filter((issue) => issue.severity === 'warning');
	assert.equal(warnings.length, 2);
	assert.equal(warnings[0].row, 0);
	assert.equal(warnings[1].row, 1);
});

test('raw text and filename are preserved', () => {
	const text = 'name,qty\nWidget,5\n';
	const result = parseCsv(text, 'inventory.csv');
	assert.equal(result.rawText, text);
	assert.equal(result.fileName, 'inventory.csv');
});
