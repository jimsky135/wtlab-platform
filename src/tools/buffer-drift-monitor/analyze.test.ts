import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeBufferDrift } from './analyze.ts';
import type { BufferDriftValidatedInput } from './types.ts';

function input(overrides: Partial<BufferDriftValidatedInput> = {}): BufferDriftValidatedInput {
	return {
		monthlyConsumption: 20,
		intendedBufferMonths: 1,
		actualBufferQuantity: 20,
		...overrides,
	};
}

test('on-target: actual buffer matches intended within tolerance', () => {
	const result = analyzeBufferDrift(input({ monthlyConsumption: 20, intendedBufferMonths: 1, actualBufferQuantity: 20 }));
	assert.equal(result.intendedBufferQuantity, 20);
	assert.equal(result.actualBufferMonths, 1);
	assert.equal(result.driftMonths, 0);
	assert.equal(result.driftPercent, 0);
	assert.equal(result.status, 'on-target');
	assert.deepEqual(result.reasonCodes, ['WITHIN_TOLERANCE']);
	assert.equal(result.primaryWarningCode, undefined);
	assert.equal(result.recommendedActionCode, 'BUFFER_DRIFT_ACTION_ON_TARGET');
});

test('within tolerance band still reads on-target (drift below the threshold)', () => {
	// intended 1 month = 20 qty; actual 21 → +5% drift, within the default 10% tolerance.
	const result = analyzeBufferDrift(input({ monthlyConsumption: 20, intendedBufferMonths: 1, actualBufferQuantity: 21 }));
	assert.equal(result.status, 'on-target');
});

test('under-buffered: actual meaningfully below intended but not severe', () => {
	// actual 12 qty = 0.6 months vs intended 1 month → drift -40%... too severe, use -20% instead.
	const result = analyzeBufferDrift(input({ monthlyConsumption: 20, intendedBufferMonths: 1, actualBufferQuantity: 16 }));
	// actual 0.8mo, drift -0.2mo, -20% — between tolerance(10%) and major(30%)
	assert.equal(result.status, 'under-buffered');
	assert.deepEqual(result.reasonCodes, ['BELOW_INTENDED']);
	assert.equal(result.primaryWarningCode, 'BUFFER_DRIFT_WARNING_UNDER');
	assert.equal(result.recommendedActionCode, 'BUFFER_DRIFT_ACTION_UNDER');
});

test('severely-under-buffered: actual materially below intended', () => {
	const result = analyzeBufferDrift(input({ monthlyConsumption: 20, intendedBufferMonths: 1, actualBufferQuantity: 5 }));
	// actual 0.25mo, drift -0.75mo, -75%
	assert.equal(result.status, 'severely-under-buffered');
	assert.deepEqual(result.reasonCodes, ['SEVERELY_BELOW_INTENDED']);
	assert.equal(result.primaryWarningCode, 'BUFFER_DRIFT_WARNING_SEVERE_UNDER');
});

test('over-buffered: actual meaningfully above intended but not severe', () => {
	const result = analyzeBufferDrift(input({ monthlyConsumption: 20, intendedBufferMonths: 1, actualBufferQuantity: 24 }));
	// actual 1.2mo, drift +0.2mo, +20%
	assert.equal(result.status, 'over-buffered');
	assert.deepEqual(result.reasonCodes, ['ABOVE_INTENDED']);
	assert.equal(result.primaryWarningCode, 'BUFFER_DRIFT_WARNING_OVER');
});

test('severely-over-buffered: actual materially above intended', () => {
	const result = analyzeBufferDrift(input({ monthlyConsumption: 20, intendedBufferMonths: 1, actualBufferQuantity: 40 }));
	// actual 2mo, drift +1mo, +100%
	assert.equal(result.status, 'severely-over-buffered');
	assert.deepEqual(result.reasonCodes, ['SEVERELY_ABOVE_INTENDED']);
	assert.equal(result.primaryWarningCode, 'BUFFER_DRIFT_WARNING_SEVERE_OVER');
});

test('zero consumption: cannot assess months, reads on-target with NO_CONSUMPTION', () => {
	const result = analyzeBufferDrift(input({ monthlyConsumption: 0, intendedBufferMonths: 1, actualBufferQuantity: 20 }));
	assert.equal(result.actualBufferMonths, undefined);
	assert.equal(result.driftMonths, undefined);
	assert.equal(result.driftPercent, undefined);
	assert.equal(result.status, 'on-target');
	assert.deepEqual(result.reasonCodes, ['NO_CONSUMPTION']);
});

test('zero intended buffer with zero actual: on-target', () => {
	const result = analyzeBufferDrift(input({ monthlyConsumption: 20, intendedBufferMonths: 0, actualBufferQuantity: 0 }));
	assert.equal(result.status, 'on-target');
	assert.deepEqual(result.reasonCodes, ['NO_INTENDED_BUFFER']);
});

test('zero intended buffer with any actual stock: over-buffered', () => {
	const result = analyzeBufferDrift(input({ monthlyConsumption: 20, intendedBufferMonths: 0, actualBufferQuantity: 10 }));
	assert.equal(result.status, 'over-buffered');
	assert.deepEqual(result.reasonCodes, ['NO_INTENDED_BUFFER']);
});

test('the engine is a pure function of its input', () => {
	const a = analyzeBufferDrift(input({ actualBufferQuantity: 16 }));
	const b = analyzeBufferDrift(input({ actualBufferQuantity: 16 }));
	assert.deepEqual(a, b);
});
