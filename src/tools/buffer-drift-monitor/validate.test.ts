import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { BufferDriftRawInput } from './types.ts';
import { validateBufferDriftInput } from './validate.ts';

const validRaw: BufferDriftRawInput = {
	monthlyConsumption: '20',
	intendedBufferMonths: '1',
	actualBufferQuantity: '16',
};

test('valid input passes and converts to numbers', () => {
	const result = validateBufferDriftInput(validRaw);
	assert.equal(result.valid, true);
	if (result.valid) {
		assert.deepEqual(result.data, { monthlyConsumption: 20, intendedBufferMonths: 1, actualBufferQuantity: 16 });
	}
});

test('monthlyConsumption = 0 is valid (not a positivity requirement here)', () => {
	const result = validateBufferDriftInput({ ...validRaw, monthlyConsumption: '0' });
	assert.equal(result.valid, true);
});

test('negative numeric input fails with a structured code', () => {
	const result = validateBufferDriftInput({ ...validRaw, actualBufferQuantity: '-1' });
	assert.equal(result.valid, false);
	if (!result.valid) {
		assert.ok(result.errors.some((e) => e.code === 'VALIDATE_NUMBER_NON_NEGATIVE' && e.params?.field === 'actualBufferQuantity'));
	}
});

test('non-numeric input fails with a structured code', () => {
	const result = validateBufferDriftInput({ ...validRaw, intendedBufferMonths: 'abc' });
	assert.equal(result.valid, false);
	if (!result.valid) {
		assert.ok(result.errors.some((e) => e.code === 'VALIDATE_NUMBER_REQUIRED' && e.params?.field === 'intendedBufferMonths'));
	}
});

test('collects every error rather than stopping at the first', () => {
	const result = validateBufferDriftInput({ monthlyConsumption: '-1', intendedBufferMonths: '-1', actualBufferQuantity: '-1' });
	assert.equal(result.valid, false);
	if (!result.valid) assert.equal(result.errors.length, 3);
});
