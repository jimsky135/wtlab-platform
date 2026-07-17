import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCsv } from './csv.ts';
import { applyMapping, suggestMapping, validateMapping } from './mapping.ts';
import type { IntakeSchema } from './types.ts';

const schema: IntakeSchema = {
	id: 'test-schema',
	title: 'Test Schema',
	fields: [
		{ id: 'name', label: 'Item Name', type: 'text', required: true },
		{ id: 'qty', label: 'Quantity', type: 'number', required: true },
		{ id: 'note', label: 'Note', type: 'text', required: false },
	],
};

test('suggestMapping matches exact field ids and labels (trimmed, case-insensitive)', () => {
	const mapping = suggestMapping(['name', 'Quantity', ' item name ', 'mystery'], schema);
	assert.equal(mapping['name'], 'name');
	assert.equal(mapping['Quantity'], 'qty');
	assert.equal(mapping[' item name '], 'name');
	assert.equal(mapping['mystery'], null);
});

test('suggestMapping never fuzzy-matches', () => {
	const mapping = suggestMapping(['nam', 'quantities', 'item'], schema);
	assert.deepEqual(Object.values(mapping), [null, null, null]);
});

test('validateMapping reports duplicate destinations as errors', () => {
	const issues = validateMapping({ a: 'qty', b: 'qty', c: 'name' }, schema);
	assert.ok(issues.some((issue) => issue.severity === 'error' && issue.field === 'qty'));
});

test('validateMapping reports unmapped required fields as errors', () => {
	const issues = validateMapping({ a: 'name' }, schema);
	assert.ok(issues.some((issue) => issue.severity === 'error' && issue.field === 'qty'));
	// Optional field left unmapped is fine.
	assert.ok(!issues.some((issue) => issue.field === 'note'));
});

test('applyMapping maps columns and preserves unknown columns verbatim', () => {
	const parse = parseCsv('item,count,supplier\nWidget,5,Acme\n');
	const records = applyMapping(parse, { item: 'name', count: 'qty', supplier: null });
	assert.equal(records.length, 1);
	assert.equal(records[0].values['name'], 'Widget');
	assert.equal(records[0].values['qty'], '5');
	assert.equal(records[0].unknown['supplier'], 'Acme');
});

test('applyMapping fills missing cells of short rows with empty strings', () => {
	const parse = parseCsv('item,count\nWidget\n');
	const records = applyMapping(parse, { item: 'name', count: 'qty' });
	assert.equal(records[0].values['name'], 'Widget');
	assert.equal(records[0].values['qty'], '');
});
