// End-to-end intake pipeline tests: normalize → validate → confirm.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canConfirm, confirmIntake } from './confirm.ts';
import { validateRecords } from './validate.ts';
import type { IntakeSchema, RawIntakeRecord } from './types.ts';

const schema: IntakeSchema = {
	id: 'test-schema',
	title: 'Test Schema',
	fields: [
		{ id: 'name', label: 'Item Name', type: 'text', required: true },
		{ id: 'qty', label: 'Quantity', type: 'number', required: true, min: 0, max: 1000 },
		{ id: 'grade', label: 'Grade', type: 'text', required: false, allowedValues: ['a', 'b'] },
	],
};

function raw(values: Record<string, string>, unknown: Record<string, string> = {}): RawIntakeRecord {
	return { values, unknown };
}

test('valid record normalizes and validates cleanly', () => {
	const result = validateRecords([raw({ name: 'Widget', qty: '5' })], schema);
	assert.equal(result.errorCount, 0);
	assert.equal(result.records[0].fields['qty'].value, 5);
});

test('required field missing is an error', () => {
	const result = validateRecords([raw({ name: '', qty: '5' })], schema);
	assert.ok(result.issues.some((issue) => issue.severity === 'error' && issue.field === 'name' && issue.row === 0));
});

test('numeric parsing produces numbers; invalid numbers are errors that keep the raw value', () => {
	const result = validateRecords([raw({ name: 'Widget', qty: 'abc' })], schema);
	const field = result.records[0].fields['qty'];
	assert.equal(field.value, undefined);
	assert.equal(field.raw, 'abc');
	assert.ok(result.issues.some((issue) => issue.severity === 'error' && issue.message.includes('not a valid number')));
});

test('normalization preserves raw values and records what changed', () => {
	const result = validateRecords([raw({ name: '  Widget  ', qty: '5' })], schema);
	const field = result.records[0].fields['name'];
	assert.equal(field.raw, '  Widget  ');
	assert.equal(field.value, 'Widget');
	assert.equal(field.changed, true);
	assert.ok(field.issues.some((issue) => issue.severity === 'info' && issue.message.includes('whitespace')));
});

test('min/max bounds are enforced when declared', () => {
	const result = validateRecords([raw({ name: 'Widget', qty: '2000' })], schema);
	assert.ok(result.issues.some((issue) => issue.severity === 'error' && issue.message.includes('at most 1000')));
});

test('allowedValues are enforced when declared', () => {
	const result = validateRecords([raw({ name: 'Widget', qty: '5', grade: 'z' })], schema);
	assert.ok(result.issues.some((issue) => issue.severity === 'error' && issue.field === 'grade'));
});

test('unknown columns survive normalization untouched', () => {
	const result = validateRecords([raw({ name: 'Widget', qty: '5' }, { supplier: 'Acme' })], schema);
	assert.equal(result.records[0].unknown['supplier'], 'Acme');
});

test('custom schema-level validation callback runs per record', () => {
	const withCallback: IntakeSchema = {
		...schema,
		validateRecord: (record) =>
			record.fields['qty'].value === 0
				? [{ severity: 'warning', message: 'Quantity is zero — confirm this is intended.', field: 'qty' }]
				: [],
	};
	const result = validateRecords([raw({ name: 'Widget', qty: '0' })], withCallback);
	assert.equal(result.warningCount, 1);
	assert.equal(result.errorCount, 0);
});

test('confirmation is blocked by errors', () => {
	const result = validateRecords([raw({ name: '', qty: '5' })], schema);
	assert.equal(canConfirm(result), false);
	const outcome = confirmIntake(schema, result);
	assert.equal(outcome.confirmed, false);
});

test('confirmation is allowed with warnings and produces instrument-ready data', () => {
	const withCallback: IntakeSchema = {
		...schema,
		validateRecord: () => [{ severity: 'warning', message: 'Heads up.' }],
	};
	const result = validateRecords([raw({ name: ' Widget ', qty: '5' })], withCallback);
	assert.equal(result.warningCount, 1);
	assert.equal(canConfirm(result), true);

	const outcome = confirmIntake(withCallback, result);
	assert.equal(outcome.confirmed, true);
	if (outcome.confirmed) {
		assert.equal(outcome.data.schemaId, 'test-schema');
		assert.deepEqual(outcome.data.records[0], { name: 'Widget', qty: 5, grade: undefined });
	}
});

test('confirmation with no records is refused', () => {
	const result = validateRecords([], schema);
	assert.equal(canConfirm(result), false);
	const outcome = confirmIntake(schema, result);
	assert.equal(outcome.confirmed, false);
});
