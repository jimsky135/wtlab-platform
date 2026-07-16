import assert from 'node:assert/strict';
import { test } from 'node:test';
import { outputToCsv, outputToJson } from './export.ts';
import type { InventoryBufferOutput } from './types.ts';

const baseOutput: InventoryBufferOutput = {
	currentCoverageMonths: 2.5,
	totalCoverageMonths: 7.5,
	minimumSafetyStock: 10,
	reorderPoint: 30,
	arrivalRisk: 'arrival-time-not-provided',
	riskStatus: 'caution',
};

test('CSV export contains a header and every output field', () => {
	const csv = outputToCsv(baseOutput);
	const lines = csv.split('\n');
	assert.equal(lines[0], 'field,value');
	assert.ok(lines.includes('currentCoverageMonths,2.5'));
	assert.ok(lines.includes('totalCoverageMonths,7.5'));
	assert.ok(lines.includes('minimumSafetyStock,10'));
	assert.ok(lines.includes('reorderPoint,30'));
	assert.ok(lines.includes('arrivalRisk,arrival-time-not-provided'));
	assert.ok(lines.includes('riskStatus,caution'));
});

test('CSV export writes not-provided when total coverage is undefined', () => {
	const csv = outputToCsv({ ...baseOutput, totalCoverageMonths: undefined });
	assert.ok(csv.split('\n').includes('totalCoverageMonths,not-provided'));
});

test('JSON export round-trips and carries tool identity', () => {
	const parsed = JSON.parse(outputToJson(baseOutput));
	assert.equal(parsed.tool, 'inventory-buffer-check');
	assert.equal(parsed.version, '0.2');
	assert.equal(parsed.output.currentCoverageMonths, 2.5);
	assert.equal(parsed.output.riskStatus, 'caution');
});

test('JSON export represents missing total coverage as null, not a dropped field', () => {
	const parsed = JSON.parse(outputToJson({ ...baseOutput, totalCoverageMonths: undefined }));
	assert.ok('totalCoverageMonths' in parsed.output);
	assert.equal(parsed.output.totalCoverageMonths, null);
});
