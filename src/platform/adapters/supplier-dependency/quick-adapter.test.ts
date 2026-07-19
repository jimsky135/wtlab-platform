import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeSupplierDependency } from '../../../tools/supplier-dependency-radar/analyze.ts';
import { validateSupplierDependencyQuickInput } from '../../../tools/supplier-dependency-radar/validate.ts';
import type { ConfirmedIntake } from '../../intake/types.ts';
import { supplierDependencyQuickAdapter } from './quick-adapter.ts';

function confirmed(records: ConfirmedIntake['records']): ConfirmedIntake {
	return { schemaId: 'supplier-dependency-quick', confirmedAt: '2026-07-19T00:00:00.000Z', records };
}

test('maps confirmed fields onto the instrument raw input, preserving blanks as empty strings', () => {
	const outcome = supplierDependencyQuickAdapter(
		confirmed([{ supplierName: 'acme', materialCount: 3, criticalMaterialCount: 1, supplierSharePercent: 60, singleSourceMaterialCount: 1, qualifiedSingleSourceMaterialCount: 0 }])
	);
	assert.equal(outcome.ok, true);
	if (outcome.ok) {
		const { supplierName, input } = outcome.data[0];
		assert.equal(supplierName, 'acme');
		assert.equal(input.materialCount, '3');
		assert.equal(input.qualifiedAlternativeAvailable, '');
	}
});

test('blank supplierName defaults the batch label to "supplier"', () => {
	const outcome = supplierDependencyQuickAdapter(
		confirmed([{ materialCount: 1, criticalMaterialCount: 0, supplierSharePercent: 10, singleSourceMaterialCount: 0, qualifiedSingleSourceMaterialCount: 0 }])
	);
	assert.equal(outcome.ok, true);
	if (outcome.ok) assert.equal(outcome.data[0].supplierName, 'supplier');
});

test('adapter output feeds the unchanged instrument pipeline end-to-end', () => {
	const outcome = supplierDependencyQuickAdapter(
		confirmed([
			{
				supplierName: 'acme',
				materialCount: 5,
				criticalMaterialCount: 2,
				supplierSharePercent: 90,
				singleSourceMaterialCount: 2,
				qualifiedSingleSourceMaterialCount: 1,
				qualifiedAlternativeAvailable: 'false',
			},
		])
	);
	assert.equal(outcome.ok, true);
	if (outcome.ok) {
		const validated = validateSupplierDependencyQuickInput(outcome.data[0].input);
		assert.equal(validated.valid, true);
		if (validated.valid) {
			const output = analyzeSupplierDependency(validated.data);
			assert.equal(output.overallRisk, 'critical');
		}
	}
});

test('instrument validation stays authoritative — adapter passes bad values through raw', () => {
	const outcome = supplierDependencyQuickAdapter(confirmed([{ supplierName: 'acme', materialCount: -5, criticalMaterialCount: 0, supplierSharePercent: 10, singleSourceMaterialCount: 0, qualifiedSingleSourceMaterialCount: 0 }]));
	assert.equal(outcome.ok, true);
	if (outcome.ok) {
		const validated = validateSupplierDependencyQuickInput(outcome.data[0].input);
		assert.equal(validated.valid, false);
	}
});

test('empty confirmed intake is refused', () => {
	const outcome = supplierDependencyQuickAdapter(confirmed([]));
	assert.equal(outcome.ok, false);
});
