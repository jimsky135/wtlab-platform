import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeRollingProjection } from './projection.ts';
import type { AdvancedPlanningInput } from './modes/advanced/types.ts';

function input(items: AdvancedPlanningInput['items']): AdvancedPlanningInput {
	return { items };
}

test('rolling balance: ending = previous + arrivals - consumption per period', () => {
	const result = computeRollingProjection(
		input([
			{
				name: 'a',
				beginningInventory: 100,
				safetyBufferMonths: undefined,
				periods: [
					{ period: 1, consumption: 30, arrivalQuantity: 0 },
					{ period: 2, consumption: 30, arrivalQuantity: 50 },
					{ period: 3, consumption: 30, arrivalQuantity: 0 },
				],
			},
		])
	);
	const balances = result.items[0].periods.map((p) => p.endingBalance);
	assert.deepEqual(balances, [70, 90, 60]);
});

test('periods are sorted even when supplied out of order', () => {
	const result = computeRollingProjection(
		input([
			{
				name: 'a',
				beginningInventory: 100,
				safetyBufferMonths: undefined,
				periods: [
					{ period: 3, consumption: 10, arrivalQuantity: 0 },
					{ period: 1, consumption: 50, arrivalQuantity: 0 },
					{ period: 2, consumption: 20, arrivalQuantity: 0 },
				],
			},
		])
	);
	assert.deepEqual(
		result.items[0].periods.map((p) => p.period),
		[1, 2, 3]
	);
	assert.deepEqual(
		result.items[0].periods.map((p) => p.endingBalance),
		[50, 30, 20]
	);
});

test('shortage point: first period where ending balance is below zero', () => {
	const result = computeRollingProjection(
		input([
			{
				name: 'a',
				beginningInventory: 50,
				safetyBufferMonths: undefined,
				periods: [
					{ period: 1, consumption: 30, arrivalQuantity: 0 },
					{ period: 2, consumption: 30, arrivalQuantity: 0 },
					{ period: 3, consumption: 30, arrivalQuantity: 100 },
				],
			},
		])
	);
	const item = result.items[0];
	assert.equal(item.firstShortagePeriod, 2);
	assert.equal(item.riskLevel, 'shortage');
	// Later arrival recovers the balance but the shortage stays recorded.
	assert.equal(item.periods[2].shortage, false);
});

test('arrival offset can prevent a shortage', () => {
	const result = computeRollingProjection(
		input([
			{
				name: 'a',
				beginningInventory: 50,
				safetyBufferMonths: undefined,
				periods: [
					{ period: 1, consumption: 30, arrivalQuantity: 0 },
					{ period: 2, consumption: 30, arrivalQuantity: 40 },
				],
			},
		])
	);
	assert.equal(result.items[0].firstShortagePeriod, undefined);
	assert.equal(result.items[0].riskLevel, 'ok');
});

test('buffer breach: buffer stock = average consumption × safetyBufferMonths', () => {
	const result = computeRollingProjection(
		input([
			{
				name: 'a',
				beginningInventory: 100,
				safetyBufferMonths: 2,
				periods: [
					{ period: 1, consumption: 30, arrivalQuantity: 0 },
					{ period: 2, consumption: 30, arrivalQuantity: 0 },
				],
			},
		])
	);
	const item = result.items[0];
	assert.equal(item.bufferStock, 60); // avg 30 × 2
	assert.equal(item.firstBufferBreachPeriod, 2); // 70 → 40 < 60
	assert.equal(item.riskLevel, 'buffer-breach');
});

test('no buffer declared → no breach detection, bufferStock undefined', () => {
	const result = computeRollingProjection(
		input([
			{
				name: 'a',
				beginningInventory: 10,
				safetyBufferMonths: undefined,
				periods: [{ period: 1, consumption: 5, arrivalQuantity: 0 }],
			},
		])
	);
	assert.equal(result.items[0].bufferStock, undefined);
	assert.equal(result.items[0].firstBufferBreachPeriod, undefined);
});

test('risk ranking: shortage before buffer breach before ok, earliest first', () => {
	const result = computeRollingProjection(
		input([
			{
				name: 'safe-item',
				beginningInventory: 1000,
				safetyBufferMonths: 1,
				periods: [{ period: 1, consumption: 10, arrivalQuantity: 0 }],
			},
			{
				name: 'late-shortage',
				beginningInventory: 50,
				safetyBufferMonths: undefined,
				periods: [
					{ period: 1, consumption: 20, arrivalQuantity: 0 },
					{ period: 2, consumption: 20, arrivalQuantity: 0 },
					{ period: 3, consumption: 20, arrivalQuantity: 0 },
				],
			},
			{
				name: 'early-shortage',
				beginningInventory: 10,
				safetyBufferMonths: undefined,
				periods: [{ period: 1, consumption: 20, arrivalQuantity: 0 }],
			},
			{
				name: 'breach-item',
				beginningInventory: 100,
				safetyBufferMonths: 3,
				periods: [
					{ period: 1, consumption: 30, arrivalQuantity: 0 },
					{ period: 2, consumption: 30, arrivalQuantity: 0 },
				],
			},
		])
	);
	assert.deepEqual(result.riskRanking, ['early-shortage', 'late-shortage', 'breach-item', 'safe-item']);
});
