// Advanced Planning projection — instrument-specific tests for the
// lead-time/gap dimension this instrument adds on top of the platform's
// shared rolling-balance pattern (Sprint 007 sprint brief: gap windows,
// multiple shortages, priority ordering).

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeLeadTimeGapProjection } from './projection.ts';
import type { LeadTimeGapAdvancedInput } from './modes/advanced/types.ts';

test('gap window: buffer breach happens before a now-ordered replenishment could arrive', () => {
	const input: LeadTimeGapAdvancedInput = {
		items: [
			{
				name: 'buffer-item',
				beginningInventory: 100,
				supplierLeadTimeMonths: 4,
				safetyBufferMonths: 2,
				periods: [
					{ period: 1, consumption: 25, arrivalQuantity: 0 },
					{ period: 2, consumption: 25, arrivalQuantity: 0 },
					{ period: 3, consumption: 25, arrivalQuantity: 0 },
				],
			},
		],
	};
	const result = computeLeadTimeGapProjection(input);
	const item = result.items[0];
	assert.equal(item.bufferStock, 50); // avg consumption 25 × 2 months buffer
	assert.equal(item.firstBufferBreachPeriod, 3); // balance: 75, 50, 25 — 25 < 50 at period 3
	assert.equal(item.firstShortagePeriod, undefined);
	assert.equal(item.expectedArrivalPeriod, 4);
	assert.equal(item.gapWindow, true); // breach at period 3, a now-order would land at period 4 — too late
	assert.equal(item.riskLevel, 'gap-window');
});

test('buffer breach without a gap window: replenishment ordered now would still arrive in time', () => {
	const input: LeadTimeGapAdvancedInput = {
		items: [
			{
				name: 'buffer-item',
				beginningInventory: 100,
				supplierLeadTimeMonths: 2,
				safetyBufferMonths: 2,
				periods: [
					{ period: 1, consumption: 25, arrivalQuantity: 0 },
					{ period: 2, consumption: 25, arrivalQuantity: 0 },
					{ period: 3, consumption: 25, arrivalQuantity: 0 },
				],
			},
		],
	};
	const result = computeLeadTimeGapProjection(input);
	const item = result.items[0];
	assert.equal(item.firstBufferBreachPeriod, 3);
	assert.equal(item.expectedArrivalPeriod, 2);
	assert.equal(item.gapWindow, false); // now-order (period 2) arrives before the period-3 breach
	assert.equal(item.riskLevel, 'buffer-breach');
});

test('multiple shortages: an item can dip negative, recover via a scheduled arrival, then dip again', () => {
	const input: LeadTimeGapAdvancedInput = {
		items: [
			{
				name: 'volatile-item',
				beginningInventory: 10,
				supplierLeadTimeMonths: undefined,
				safetyBufferMonths: undefined,
				periods: [
					{ period: 1, consumption: 20, arrivalQuantity: 0 }, // 10 - 20 = -10 (shortage)
					{ period: 2, consumption: 5, arrivalQuantity: 20 }, // -10 + 20 - 5 = 5 (recovered)
					{ period: 3, consumption: 10, arrivalQuantity: 0 }, // 5 - 10 = -5 (shortage again)
				],
			},
		],
	};
	const result = computeLeadTimeGapProjection(input);
	const item = result.items[0];
	assert.equal(item.shortagePeriodCount, 2);
	assert.equal(item.firstShortagePeriod, 1);
	assert.equal(item.riskLevel, 'shortage');
	assert.equal(item.expectedArrivalPeriod, undefined); // lead time not declared for this item
	assert.equal(item.gapWindow, false); // gapWindow requires a declared expected arrival period
});

test('priority ordering: shortage before gap-window before buffer-breach before ok, earliest period first', () => {
	const input: LeadTimeGapAdvancedInput = {
		items: [
			{
				name: 'ok-item',
				beginningInventory: 1000,
				supplierLeadTimeMonths: 1,
				safetyBufferMonths: 1,
				periods: [{ period: 1, consumption: 10, arrivalQuantity: 0 }],
			},
			{
				name: 'gap-window-item',
				beginningInventory: 100,
				supplierLeadTimeMonths: 4,
				safetyBufferMonths: 2,
				periods: [
					{ period: 1, consumption: 25, arrivalQuantity: 0 },
					{ period: 2, consumption: 25, arrivalQuantity: 0 },
					{ period: 3, consumption: 25, arrivalQuantity: 0 },
				],
			},
			{
				name: 'shortage-item',
				beginningInventory: 10,
				supplierLeadTimeMonths: 1,
				safetyBufferMonths: undefined,
				periods: [{ period: 1, consumption: 20, arrivalQuantity: 0 }],
			},
		],
	};
	const result = computeLeadTimeGapProjection(input);
	assert.deepEqual(result.riskRanking, ['shortage-item', 'gap-window-item', 'ok-item']);
});

test('no items declaring a shortage or breach ranks by name-agnostic "ok" with earliest period tie-break irrelevant', () => {
	const input: LeadTimeGapAdvancedInput = {
		items: [
			{ name: 'a', beginningInventory: 1000, supplierLeadTimeMonths: 1, safetyBufferMonths: 1, periods: [{ period: 1, consumption: 10, arrivalQuantity: 0 }] },
			{ name: 'b', beginningInventory: 1000, supplierLeadTimeMonths: 1, safetyBufferMonths: 1, periods: [{ period: 1, consumption: 10, arrivalQuantity: 0 }] },
		],
	};
	const result = computeLeadTimeGapProjection(input);
	assert.deepEqual(result.items.map((i) => i.riskLevel), ['ok', 'ok']);
});
