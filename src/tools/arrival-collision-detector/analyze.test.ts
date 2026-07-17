import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeArrivals } from './analyze.ts';
import type { ArrivalAnalysisInput, ArrivalRecord } from './types.ts';

function arrival(monthKey: string, quantity: number, container?: string, supplier?: string): ArrivalRecord {
	return { monthKey, quantity, container, supplier };
}

function input(arrivals: ArrivalRecord[], monthlyCapacity?: number): ArrivalAnalysisInput {
	return { arrivals, monthlyCapacity };
}

test('monthly aggregation: totals, batch counts, distinct containers/suppliers, sorted months', () => {
	const analysis = analyzeArrivals(
		input([
			arrival('2026-09', 100, 'C-03', 'sup-a'),
			arrival('2026-08', 500, 'C-01', 'sup-a'),
			arrival('2026-08', 400, 'C-02', 'sup-b'),
			arrival('2026-08', 100, 'C-02', 'sup-b'),
		])
	);
	assert.deepEqual(analysis.months.map((m) => m.monthKey), ['2026-08', '2026-09']);
	const aug = analysis.months[0];
	assert.equal(aug.totalQuantity, 1000);
	assert.equal(aug.batchCount, 3);
	assert.equal(aug.containerCount, 2);
	assert.equal(aug.supplierCount, 2);
	assert.ok(Math.abs(aug.share - 1000 / 1100) < 1e-9);
});

test('peak month is the highest-quantity month', () => {
	const analysis = analyzeArrivals(input([arrival('2026-08', 100), arrival('2026-09', 300), arrival('2026-10', 200)]));
	assert.equal(analysis.peakMonth, '2026-09');
});

test('severe: peak month has ≥2 batches and ≥60% of total quantity', () => {
	const analysis = analyzeArrivals(
		input([arrival('2026-08', 500), arrival('2026-08', 400), arrival('2026-09', 100)])
	);
	assert.equal(analysis.collisionLevel, 'severe');
	assert.ok(analysis.warnings.some((warning) => warning.severity === 'high'));
	assert.ok(analysis.suggestion.includes('Split or reschedule'));
});

test('moderate: peak month has ≥2 batches and ≥40% share but under 60%', () => {
	const analysis = analyzeArrivals(
		input([arrival('2026-08', 250), arrival('2026-08', 250), arrival('2026-09', 300), arrival('2026-10', 300)])
	);
	assert.equal(analysis.collisionLevel, 'moderate');
});

test('none: arrivals spread out with no concentrated peak', () => {
	const analysis = analyzeArrivals(
		input([arrival('2026-08', 100), arrival('2026-09', 120), arrival('2026-10', 110), arrival('2026-11', 100)])
	);
	assert.equal(analysis.collisionLevel, 'none');
	assert.equal(analysis.suggestion, 'No significant arrival concentration detected.');
});

test('a single batch never collides', () => {
	const analysis = analyzeArrivals(input([arrival('2026-08', 10000)]));
	assert.equal(analysis.collisionLevel, 'none');
});

test('capacity: any month over declared capacity is severe with a high warning', () => {
	const analysis = analyzeArrivals(
		input([arrival('2026-08', 700), arrival('2026-09', 300)], 600)
	);
	assert.equal(analysis.collisionLevel, 'severe');
	assert.equal(analysis.months[0].overCapacity, true);
	assert.equal(analysis.months[1].overCapacity, false);
	assert.ok(analysis.warnings[0].message.includes('exceed monthly capacity'));
});

test('no capacity declared → overCapacity stays undefined', () => {
	const analysis = analyzeArrivals(input([arrival('2026-08', 700)]));
	assert.equal(analysis.months[0].overCapacity, undefined);
});

test('warning priority: capacity warnings come before concentration warnings', () => {
	const analysis = analyzeArrivals(
		input([arrival('2026-08', 500), arrival('2026-08', 400), arrival('2026-09', 100)], 600)
	);
	assert.ok(analysis.warnings.length >= 2);
	assert.ok(analysis.warnings[0].message.includes('capacity'));
});

test('container stacking: ≥3 distinct containers in one month produces a medium warning', () => {
	const analysis = analyzeArrivals(
		input([
			arrival('2026-08', 100, 'C-01'),
			arrival('2026-08', 100, 'C-02'),
			arrival('2026-08', 100, 'C-03'),
			arrival('2026-09', 400, 'C-04'),
		])
	);
	assert.ok(
		analysis.warnings.some((warning) => warning.severity === 'medium' && warning.message.includes('containers'))
	);
});
