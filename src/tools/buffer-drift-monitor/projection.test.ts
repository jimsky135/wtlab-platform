// Advanced Planning projection — instrument-specific tests for the trend
// dimension this instrument adds on top of the platform's shared
// long-format rolling pattern (Sprint 008: "drift ... over time").

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeBufferDriftProjection } from './projection.ts';
import type { BufferDriftAdvancedInput } from './modes/advanced/types.ts';

test('widening trend: drift magnitude grows across periods', () => {
	const input: BufferDriftAdvancedInput = {
		items: [
			{
				name: 'a',
				intendedBufferMonths: 1,
				periods: [
					{ period: 1, monthlyConsumption: 20, actualBufferQuantity: 20 }, // drift 0%
					{ period: 2, monthlyConsumption: 20, actualBufferQuantity: 10 }, // drift -50%
				],
			},
		],
	};
	const result = computeBufferDriftProjection(input);
	assert.equal(result.items[0].trend, 'widening');
	assert.equal(result.items[0].latestStatus, 'severely-under-buffered');
});

test('narrowing trend: drift magnitude shrinks across periods', () => {
	const input: BufferDriftAdvancedInput = {
		items: [
			{
				name: 'a',
				intendedBufferMonths: 1,
				periods: [
					{ period: 1, monthlyConsumption: 20, actualBufferQuantity: 5 }, // drift -75%
					{ period: 2, monthlyConsumption: 20, actualBufferQuantity: 17 }, // drift -15%
				],
			},
		],
	};
	const result = computeBufferDriftProjection(input);
	assert.equal(result.items[0].trend, 'narrowing');
});

test('stable trend: drift magnitude holds steady across periods', () => {
	const input: BufferDriftAdvancedInput = {
		items: [
			{
				name: 'a',
				intendedBufferMonths: 1,
				periods: [
					{ period: 1, monthlyConsumption: 20, actualBufferQuantity: 16 }, // drift -20%
					{ period: 2, monthlyConsumption: 20, actualBufferQuantity: 16 }, // drift -20%
				],
			},
		],
	};
	const result = computeBufferDriftProjection(input);
	assert.equal(result.items[0].trend, 'stable');
});

test('single-period items are stable by definition (first === last)', () => {
	const input: BufferDriftAdvancedInput = {
		items: [{ name: 'a', intendedBufferMonths: 1, periods: [{ period: 1, monthlyConsumption: 20, actualBufferQuantity: 16 }] }],
	};
	const result = computeBufferDriftProjection(input);
	assert.equal(result.items[0].trend, 'stable');
});

test('priority ranking: severely-under before under before severely-over before over before on-target', () => {
	const mk = (name: string, actual: number) => ({
		name,
		intendedBufferMonths: 1,
		periods: [{ period: 1, monthlyConsumption: 20, actualBufferQuantity: actual }],
	});
	const input: BufferDriftAdvancedInput = {
		items: [mk('on-target', 20), mk('over', 24), mk('severe-over', 40), mk('under', 16), mk('severe-under', 5)],
	};
	const result = computeBufferDriftProjection(input);
	assert.deepEqual(result.riskRanking, ['severe-under', 'under', 'severe-over', 'over', 'on-target']);
});

test('within a status tier, widening ranks worse than stable', () => {
	const input: BufferDriftAdvancedInput = {
		items: [
			{
				name: 'widening-item',
				intendedBufferMonths: 1,
				periods: [
					{ period: 1, monthlyConsumption: 20, actualBufferQuantity: 18 },
					{ period: 2, monthlyConsumption: 20, actualBufferQuantity: 10 },
				],
			},
			{
				name: 'stable-item',
				intendedBufferMonths: 1,
				periods: [
					{ period: 1, monthlyConsumption: 20, actualBufferQuantity: 10 },
					{ period: 2, monthlyConsumption: 20, actualBufferQuantity: 10 },
				],
			},
		],
	};
	const result = computeBufferDriftProjection(input);
	// Both end at severely-under-buffered (actual 10 = 0.5mo, drift -50%); widening ranks first.
	assert.deepEqual(result.riskRanking, ['widening-item', 'stable-item']);
});
