import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateInventoryBuffer } from './calculate.ts';
import type { InventoryBufferValidatedInput } from './types.ts';

const base: InventoryBufferValidatedInput = {
	currentStock: 100,
	monthlyConsumption: 10,
	leadTimeMonths: 2,
	safetyBufferMonths: 1,
	inTransitQuantity: undefined,
	arrivalTimeMonths: undefined,
};

// Case 1 — Safe: currentCoverageMonths (10) >= leadTimeMonths + safetyBufferMonths (3).
test('Case 1 — Safe', () => {
	const result = calculateInventoryBuffer(base);
	assert.equal(result.currentCoverageMonths, 10);
	assert.equal(result.riskStatus, 'safe');
});

// Case 2 — Caution: currentCoverageMonths (2.5) is within [L, L+B) = [2, 3).
test('Case 2 — Caution', () => {
	const result = calculateInventoryBuffer({ ...base, currentStock: 25 });
	assert.equal(result.currentCoverageMonths, 2.5);
	assert.equal(result.riskStatus, 'caution');
});

// Case 3 — High Risk: currentCoverageMonths (1) < leadTimeMonths (2).
test('Case 3 — High Risk', () => {
	const result = calculateInventoryBuffer({ ...base, currentStock: 10 });
	assert.equal(result.currentCoverageMonths, 1);
	assert.equal(result.riskStatus, 'high-risk');
});

// Case 4 — Possible shortage before arrival: currentCoverageMonths (1) < arrivalTimeMonths (2).
test('Case 4 — Possible shortage before arrival', () => {
	const result = calculateInventoryBuffer({ ...base, currentStock: 10, arrivalTimeMonths: 2 });
	assert.equal(result.arrivalRisk, 'possible-shortage');
});

// Case 5 — Can cover until arrival: currentCoverageMonths (10) >= arrivalTimeMonths (2).
test('Case 5 — Can cover until arrival', () => {
	const result = calculateInventoryBuffer({ ...base, arrivalTimeMonths: 2 });
	assert.equal(result.arrivalRisk, 'can-cover-until-arrival');
});

// Case 6 — No in-transit quantity: totalCoverageMonths stays "not provided" (undefined), not defaulted.
test('Case 6 — No in-transit quantity', () => {
	const result = calculateInventoryBuffer(base);
	assert.equal(result.totalCoverageMonths, undefined);
});

// Case 7 — In-transit quantity provided: totalCoverageMonths = (S + T) / D.
test('Case 7 — In-transit quantity provided', () => {
	const result = calculateInventoryBuffer({ ...base, inTransitQuantity: 50 });
	assert.equal(result.totalCoverageMonths, 15);
});

test('minimumSafetyStock and reorderPoint formulas', () => {
	const result = calculateInventoryBuffer(base);
	assert.equal(result.minimumSafetyStock, 10); // D * B = 10 * 1
	assert.equal(result.reorderPoint, 30); // D * (L + B) = 10 * (2 + 1)
});

test('arrivalRisk is arrival-time-not-provided when arrivalTimeMonths is undefined', () => {
	const result = calculateInventoryBuffer(base);
	assert.equal(result.arrivalRisk, 'arrival-time-not-provided');
});
