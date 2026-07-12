import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { InventoryBufferRawInput } from './types.ts';
import { validateInventoryBufferInput } from './validate.ts';

const validRaw: InventoryBufferRawInput = {
	currentStock: '100',
	monthlyConsumption: '10',
	leadTime: '2',
	leadTimeUnit: 'month',
	safetyBuffer: '1',
	safetyBufferUnit: 'month',
};

// Case 8 — 30 days equals 1 month: unit conversion must agree regardless of input unit.
test('Case 8 — 30 days equals 1 month', () => {
	const inDays = validateInventoryBufferInput({ ...validRaw, leadTime: '30', leadTimeUnit: 'day' });
	const inMonths = validateInventoryBufferInput({ ...validRaw, leadTime: '1', leadTimeUnit: 'month' });

	assert.equal(inDays.valid, true);
	assert.equal(inMonths.valid, true);
	if (inDays.valid && inMonths.valid) {
		assert.equal(inDays.data.leadTimeMonths, inMonths.data.leadTimeMonths);
		assert.equal(inDays.data.leadTimeMonths, 1);
	}
});

// Case 9 — monthlyConsumption = 0 must fail validation (spec requires > 0).
test('Case 9 — monthlyConsumption = 0 fails validation', () => {
	const result = validateInventoryBufferInput({ ...validRaw, monthlyConsumption: '0' });
	assert.equal(result.valid, false);
	if (!result.valid) {
		assert.ok(result.errors.some((message) => message.includes('monthlyConsumption')));
	}
});

// Case 10 — negative numeric input must fail validation.
test('Case 10 — negative numeric input fails validation', () => {
	const result = validateInventoryBufferInput({ ...validRaw, currentStock: '-5' });
	assert.equal(result.valid, false);
	if (!result.valid) {
		assert.ok(result.errors.some((message) => message.includes('currentStock')));
	}
});

test('optional fields omitted are treated as not provided, not zero', () => {
	const result = validateInventoryBufferInput(validRaw);
	assert.equal(result.valid, true);
	if (result.valid) {
		assert.equal(result.data.inTransitQuantity, undefined);
		assert.equal(result.data.arrivalTimeMonths, undefined);
	}
});

test('negative optional fields, when provided, also fail validation', () => {
	const result = validateInventoryBufferInput({ ...validRaw, inTransitQuantity: '-1' });
	assert.equal(result.valid, false);
	if (!result.valid) {
		assert.ok(result.errors.some((message) => message.includes('inTransitQuantity')));
	}
});
