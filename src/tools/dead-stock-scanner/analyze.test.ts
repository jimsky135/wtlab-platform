import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeDeadStock } from './analyze.ts';
import { DEFAULT_THRESHOLDS, type DeadStockItemInput } from './types.ts';

function item(overrides: Partial<DeadStockItemInput> & { item: string }): DeadStockItemInput {
	return {
		currentStock: 0,
		recentMonthlyConsumption: 0,
		monthsSinceLastMovement: undefined,
		futureDemand: undefined,
		unitCost: undefined,
		category: undefined,
		...overrides,
	};
}

function analyzeOne(input: DeadStockItemInput) {
	return analyzeDeadStock({ items: [input], thresholds: DEFAULT_THRESHOLDS }).items[0];
}

test('healthy: active consumption with reasonable coverage', () => {
	const result = analyzeOne(item({ item: 'a', currentStock: 90, recentMonthlyConsumption: 30, monthsSinceLastMovement: 0 }));
	assert.equal(result.classification, 'healthy');
	assert.equal(result.coverageMonths, 3);
	assert.ok(result.reasonCodes.includes('ACTIVE_CONSUMPTION'));
	assert.equal(result.priority, 'low');
	assert.equal(result.primaryWarning, undefined);
});

test('slow-moving: coverage at/above high threshold but below excess', () => {
	const result = analyzeOne(item({ item: 'a', currentStock: 150, recentMonthlyConsumption: 10 }));
	assert.equal(result.coverageMonths, 15);
	assert.equal(result.classification, 'slow-moving');
	assert.ok(result.reasonCodes.includes('HIGH_COVERAGE'));
	assert.equal(result.priority, 'medium');
});

test('excess-exposure: coverage at/above excess threshold', () => {
	const result = analyzeOne(item({ item: 'a', currentStock: 300, recentMonthlyConsumption: 10 }));
	assert.equal(result.coverageMonths, 30);
	assert.equal(result.classification, 'excess-exposure');
	assert.ok(result.reasonCodes.includes('EXCESS_QUANTITY'));
	// excess = 300 − max(0, 10×12) = 180
	assert.equal(result.excessQuantity, 180);
	assert.equal(result.priority, 'high');
});

test('dead-stock requires: no consumption + explicit zero demand + long dormancy', () => {
	const result = analyzeOne(
		item({ item: 'a', currentStock: 500, recentMonthlyConsumption: 0, monthsSinceLastMovement: 14, futureDemand: 0 })
	);
	assert.equal(result.classification, 'dead-stock');
	assert.equal(result.dormancyStatus, 'long-dormant');
	assert.deepEqual(
		result.reasonCodes.filter((code) => code === 'NO_RECENT_MOVEMENT' || code === 'NO_FUTURE_DEMAND'),
		['NO_RECENT_MOVEMENT', 'NO_FUTURE_DEMAND']
	);
});

test('unknown future demand blocks a dead-stock verdict → dormant', () => {
	const result = analyzeOne(
		item({ item: 'a', currentStock: 500, recentMonthlyConsumption: 0, monthsSinceLastMovement: 14 })
	);
	assert.equal(result.classification, 'dormant');
});

test('unknown movement age blocks a dead-stock verdict → dormant with UNKNOWN_MOVEMENT_AGE', () => {
	const result = analyzeOne(item({ item: 'a', currentStock: 500, recentMonthlyConsumption: 0, futureDemand: 0 }));
	assert.equal(result.classification, 'dormant');
	assert.ok(result.reasonCodes.includes('UNKNOWN_MOVEMENT_AGE'));
});

test('known future demand covering stock rescues to healthy with FUTURE_DEMAND_SUPPORT', () => {
	const result = analyzeOne(
		item({ item: 'a', currentStock: 500, recentMonthlyConsumption: 0, monthsSinceLastMovement: 14, futureDemand: 600 })
	);
	assert.equal(result.classification, 'healthy');
	assert.equal(result.futureDemandSupport, true);
	assert.ok(result.reasonCodes.includes('FUTURE_DEMAND_SUPPORT'));
});

test('zero stock is healthy with NO_STOCK and no exposure', () => {
	const result = analyzeOne(item({ item: 'a', currentStock: 0, recentMonthlyConsumption: 0, futureDemand: 0 }));
	assert.equal(result.classification, 'healthy');
	assert.deepEqual(result.reasonCodes, ['NO_STOCK']);
	assert.equal(result.excessQuantity, 0);
});

test('exposure value: dead stock exposes full stock × unit cost', () => {
	const result = analyzeOne(
		item({ item: 'a', currentStock: 500, recentMonthlyConsumption: 0, monthsSinceLastMovement: 20, futureDemand: 0, unitCost: 12 })
	);
	assert.equal(result.exposureValue, 6000);
});

test('exposure value: excess exposure exposes only the excess quantity', () => {
	const result = analyzeOne(item({ item: 'a', currentStock: 300, recentMonthlyConsumption: 10, unitCost: 2 }));
	assert.equal(result.exposureValue, 360); // 180 × 2
});

test('exposure value is undefined without unit cost', () => {
	const result = analyzeOne(item({ item: 'a', currentStock: 300, recentMonthlyConsumption: 10 }));
	assert.equal(result.exposureValue, undefined);
});

test('custom thresholds change classification boundaries deterministically', () => {
	const analysis = analyzeDeadStock({
		items: [item({ item: 'a', currentStock: 150, recentMonthlyConsumption: 10 })],
		thresholds: { ...DEFAULT_THRESHOLDS, highCoverageMonths: 20, excessCoverageMonths: 40 },
	});
	assert.equal(analysis.items[0].classification, 'healthy'); // 15 < 20
});

test('portfolio summary: counts, totals, unknown-cost tracking, top risk ordering', () => {
	const analysis = analyzeDeadStock({
		items: [
			item({ item: 'healthy-a', currentStock: 90, recentMonthlyConsumption: 30 }),
			item({ item: 'dead-a', currentStock: 100, recentMonthlyConsumption: 0, monthsSinceLastMovement: 15, futureDemand: 0, unitCost: 5 }),
			item({ item: 'excess-a', currentStock: 300, recentMonthlyConsumption: 10, unitCost: 2 }),
			item({ item: 'dormant-a', currentStock: 50, recentMonthlyConsumption: 0, monthsSinceLastMovement: 8 }),
		],
		thresholds: DEFAULT_THRESHOLDS,
	});
	const summary = analysis.summary;
	assert.equal(summary.totalItems, 4);
	assert.equal(summary.counts['dead-stock'], 1);
	assert.equal(summary.counts['excess-exposure'], 1);
	assert.equal(summary.counts.dormant, 1);
	assert.equal(summary.counts.healthy, 1);
	assert.equal(summary.totalExcessQuantity, 100 + 180 + 50); // dead 100, excess 180, dormant 50
	assert.equal(summary.totalExposureValue, 500 + 360);
	assert.equal(summary.itemsWithoutUnitCost, 2);
	assert.deepEqual(summary.topRiskItems, ['dead-a', 'excess-a', 'dormant-a']);
});
