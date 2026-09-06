import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { DemandWaveRawInput } from './types.ts';
import { validateDemandWaveInput } from './validate.ts';

const BLANK: DemandWaveRawInput = { annual: '', h1: '', h2: '', q1: '', q2: '', q3: '', q4: '' };

function input(overrides: Partial<DemandWaveRawInput>): DemandWaveRawInput {
	return { ...BLANK, ...overrides };
}

test('a blank window is dropped, not zero-filled — no history is not zero demand', () => {
	const result = validateDemandWaveInput(input({ annual: '100', q3: '140' }));
	assert.equal(result.valid, true);
	if (result.valid) {
		assert.deepEqual(result.data.windows, [
			{ window: 'annual', monthlyAverage: 100 },
			{ window: 'q3', monthlyAverage: 140 },
		]);
	}
});

test('provided windows come back in canonical order regardless of which ones were filled', () => {
	const result = validateDemandWaveInput(input({ q4: '10', h1: '20', annual: '30' }));
	assert.equal(result.valid, true);
	if (result.valid) {
		assert.deepEqual(
			result.data.windows.map((window) => window.window),
			['annual', 'h1', 'q4']
		);
	}
});

test('an explicit 0 is real data and is kept — only blank means missing', () => {
	const result = validateDemandWaveInput(input({ annual: '0', q1: '5' }));
	assert.equal(result.valid, true);
	if (result.valid) {
		assert.equal(result.data.windows.length, 2);
		assert.equal(result.data.windows[0].monthlyAverage, 0);
	}
});

test('a whitespace-only window counts as blank', () => {
	const result = validateDemandWaveInput(input({ annual: '   ', q1: '5' }));
	assert.equal(result.valid, true);
	if (result.valid) {
		assert.deepEqual(result.data.windows, [{ window: 'q1', monthlyAverage: 5 }]);
	}
});

test('a non-numeric window is rejected and names the window as the field', () => {
	const result = validateDemandWaveInput(input({ h2: 'about 40' }));
	assert.equal(result.valid, false);
	if (!result.valid) {
		assert.deepEqual(
			result.errors.map((e) => e.code),
			['VALIDATE_NUMBER_REQUIRED']
		);
		assert.equal(result.errors[0].params?.field, 'h2');
	}
});

test('a negative window is rejected', () => {
	const result = validateDemandWaveInput(input({ q2: '-1' }));
	assert.equal(result.valid, false);
	if (!result.valid) {
		assert.deepEqual(
			result.errors.map((e) => e.code),
			['VALIDATE_NUMBER_NON_NEGATIVE']
		);
	}
});

test('an all-blank record is rejected — there is nothing to compare', () => {
	const result = validateDemandWaveInput(BLANK);
	assert.equal(result.valid, false);
	if (!result.valid) {
		assert.deepEqual(
			result.errors.map((e) => e.code),
			['VALIDATE_AT_LEAST_ONE_DEMAND_WINDOW']
		);
	}
});

test('the empty-record error is not raised when a window already failed to parse', () => {
	const result = validateDemandWaveInput(input({ q1: 'n/a' }));
	assert.equal(result.valid, false);
	if (!result.valid) {
		assert.deepEqual(
			result.errors.map((e) => e.code),
			['VALIDATE_NUMBER_REQUIRED']
		);
	}
});

test('every invalid window is reported, not just the first', () => {
	const result = validateDemandWaveInput(input({ q1: 'x', q2: '-5', q3: '7' }));
	assert.equal(result.valid, false);
	if (!result.valid) {
		assert.deepEqual(result.errors.map((e) => e.code).sort(), [
			'VALIDATE_NUMBER_NON_NEGATIVE',
			'VALIDATE_NUMBER_REQUIRED',
		]);
	}
});
