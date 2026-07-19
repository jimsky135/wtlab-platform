import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { LeadTimeGapRawInput } from './types.ts';
import { validateLeadTimeGapInput } from './validate.ts';

const validRaw: LeadTimeGapRawInput = {
	currentStock: '100',
	monthlyConsumption: '10',
	leadTime: '2',
	leadTimeUnit: 'month',
	safetyBuffer: '1',
	safetyBufferUnit: 'month',
	currentDate: '2026-01-01',
};

test('30 days equals 1 month: unit conversion agrees regardless of input unit', () => {
	const inDays = validateLeadTimeGapInput({ ...validRaw, leadTime: '30', leadTimeUnit: 'day' });
	const inMonths = validateLeadTimeGapInput({ ...validRaw, leadTime: '1', leadTimeUnit: 'month' });
	assert.equal(inDays.valid, true);
	assert.equal(inMonths.valid, true);
	if (inDays.valid && inMonths.valid) {
		assert.equal(inDays.data.leadTimeMonths, inMonths.data.leadTimeMonths);
		assert.equal(inDays.data.leadTimeMonths, 1);
	}
});

test('monthlyConsumption = 0 is valid (never depletes is a legitimate safe case, not an error)', () => {
	const result = validateLeadTimeGapInput({ ...validRaw, monthlyConsumption: '0' });
	assert.equal(result.valid, true);
	if (result.valid) assert.equal(result.data.monthlyConsumption, 0);
});

test('negative numeric input fails validation with a structured code', () => {
	const result = validateLeadTimeGapInput({ ...validRaw, currentStock: '-5' });
	assert.equal(result.valid, false);
	if (!result.valid) {
		assert.ok(result.errors.some((e) => e.code === 'VALIDATE_NUMBER_NON_NEGATIVE' && e.params?.field === 'currentStock'));
	}
});

test('non-numeric input fails validation with a structured code', () => {
	const result = validateLeadTimeGapInput({ ...validRaw, monthlyConsumption: 'abc' });
	assert.equal(result.valid, false);
	if (!result.valid) {
		assert.ok(result.errors.some((e) => e.code === 'VALIDATE_NUMBER_REQUIRED' && e.params?.field === 'monthlyConsumption'));
	}
});

test('blank currentDate defaults to today, not an error', () => {
	const result = validateLeadTimeGapInput({ ...validRaw, currentDate: '' });
	assert.equal(result.valid, true);
	if (result.valid) {
		assert.equal(result.data.currentDate, new Date().toISOString().slice(0, 10));
	}
});

test('malformed currentDate fails validation with a structured code', () => {
	const result = validateLeadTimeGapInput({ ...validRaw, currentDate: '2026/01/01' });
	assert.equal(result.valid, false);
	if (!result.valid) {
		assert.ok(result.errors.some((e) => e.code === 'LEAD_TIME_CURRENT_DATE_INVALID_ISO'));
	}
});

test('valid ISO currentDate passes through unchanged', () => {
	const result = validateLeadTimeGapInput({ ...validRaw, currentDate: '2026-03-15' });
	assert.equal(result.valid, true);
	if (result.valid) assert.equal(result.data.currentDate, '2026-03-15');
});
