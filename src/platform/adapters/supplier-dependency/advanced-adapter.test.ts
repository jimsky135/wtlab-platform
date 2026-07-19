import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeSupplierDependencyPortfolio } from '../../../tools/supplier-dependency-radar/portfolio.ts';
import type { ConfirmedIntake } from '../../intake/types.ts';
import { supplierDependencyAdvancedAdapter, toSupplierMaterialRelationships } from './advanced-adapter.ts';

function confirmed(records: ConfirmedIntake['records']): ConfirmedIntake {
	return { schemaId: 'supplier-dependency-advanced', confirmedAt: '2026-07-19T00:00:00.000Z', records };
}

test('maps confirmed fields into typed relationships; unknown booleans stay undefined, never defaulted to false', () => {
	const relationships = toSupplierMaterialRelationships([
		{ supplierName: 'acme', materialName: 'resin', criticalMaterial: 'true', singleSource: 'true', qualifiedAlternativeAvailable: undefined },
	]);
	assert.equal(relationships[0].criticalMaterial, true);
	assert.equal(relationships[0].singleSource, true);
	assert.equal(relationships[0].qualifiedAlternativeAvailable, undefined);
});

test('"false" string parses to a real false, distinct from the undefined/unknown case', () => {
	const relationships = toSupplierMaterialRelationships([{ supplierName: 'acme', materialName: 'resin', criticalMaterial: 'false' }]);
	assert.equal(relationships[0].criticalMaterial, false);
});

test('adapters contain no classification logic — engine over adapted input matches direct input', () => {
	const outcome = supplierDependencyAdvancedAdapter(
		confirmed([{ supplierName: 'acme', materialName: 'resin', criticalMaterial: 'true', singleSource: 'true', qualifiedAlternativeAvailable: 'false', qualificationLeadTimeMonths: 9 }])
	);
	assert.equal(outcome.ok, true);
	if (outcome.ok) {
		const viaAdapter = computeSupplierDependencyPortfolio(outcome.data);
		const direct = computeSupplierDependencyPortfolio({
			relationships: [
				{
					supplierName: 'acme',
					materialName: 'resin',
					materialCategory: undefined,
					supplierSharePercent: undefined,
					criticalMaterial: true,
					singleSource: true,
					alternativeSupplierAvailable: undefined,
					qualifiedAlternativeAvailable: false,
					qualificationRequired: undefined,
					qualificationLeadTimeMonths: 9,
					customerApprovalRequired: undefined,
					trialProductionRequired: undefined,
					leadTimeDays: undefined,
					averageDelayDays: undefined,
					deliveryReliabilityPercent: undefined,
					agreementCancellationCount: undefined,
					annualUsage: undefined,
					annualExposureValue: undefined,
					optionalNotes: undefined,
				},
			],
		});
		assert.deepEqual(viaAdapter, direct);
	}
});

test('empty confirmed intake is refused', () => {
	assert.equal(supplierDependencyAdvancedAdapter(confirmed([])).ok, false);
});
