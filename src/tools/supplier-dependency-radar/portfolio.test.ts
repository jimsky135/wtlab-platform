// Advanced Scan portfolio engine tests (Sprint 009): supplier roll-up,
// material-level classification, portfolio summary, and the two
// independent rankings (supplier ranking never mixed with material
// ranking).

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeSupplierDependencyPortfolio } from './portfolio.ts';
import type { SupplierMaterialRelationship } from './modes/advanced/types.ts';

function relationship(overrides: Partial<SupplierMaterialRelationship>): SupplierMaterialRelationship {
	return {
		supplierName: 'supplier-a',
		materialName: 'material-1',
		materialCategory: undefined,
		supplierSharePercent: undefined,
		criticalMaterial: undefined,
		singleSource: undefined,
		alternativeSupplierAvailable: undefined,
		qualifiedAlternativeAvailable: undefined,
		qualificationRequired: undefined,
		qualificationLeadTimeMonths: undefined,
		customerApprovalRequired: undefined,
		trialProductionRequired: undefined,
		leadTimeDays: undefined,
		averageDelayDays: undefined,
		deliveryReliabilityPercent: undefined,
		agreementCancellationCount: undefined,
		annualUsage: undefined,
		annualExposureValue: undefined,
		optionalNotes: undefined,
		...overrides,
	};
}

test('a supplier serving many materials rolls up into one supplier-level summary with the right material count', () => {
	const result = computeSupplierDependencyPortfolio({
		relationships: [
			relationship({ supplierName: 'supplier-a', materialName: 'm1', supplierSharePercent: 80 }),
			relationship({ supplierName: 'supplier-a', materialName: 'm2', supplierSharePercent: 60 }),
			relationship({ supplierName: 'supplier-a', materialName: 'm3', supplierSharePercent: 40 }),
		],
	});
	assert.equal(result.suppliers.length, 1);
	assert.equal(result.suppliers[0].materialCount, 3);
	assert.equal(result.suppliers[0].averageSupplierSharePercent, 60);
	assert.equal(result.materials.length, 3);
});

test('a material with multiple suppliers is represented as separate relationship rows, not merged', () => {
	const result = computeSupplierDependencyPortfolio({
		relationships: [
			relationship({ supplierName: 'supplier-a', materialName: 'shared-material', singleSource: false }),
			relationship({ supplierName: 'supplier-b', materialName: 'shared-material', singleSource: false }),
		],
	});
	assert.equal(result.suppliers.length, 2);
	assert.equal(result.materials.filter((m) => m.materialName === 'shared-material').length, 2);
});

test('portfolio aggregation is worst-case/cautious: unknown qualification on any row does not get resolved to a confident supplier-level qualification dependency', () => {
	const result = computeSupplierDependencyPortfolio({
		relationships: [
			relationship({ supplierName: 'supplier-a', materialName: 'm1', qualifiedAlternativeAvailable: true }),
			relationship({ supplierName: 'supplier-a', materialName: 'm2', qualifiedAlternativeAvailable: undefined }),
		],
	});
	const supplier = result.suppliers[0];
	assert.notEqual(supplier.qualificationDependencyLevel, 'low');
});

test('portfolio aggregation: any row with no qualified alternative surfaces NO_QUALIFIED_ALTERNATIVE at supplier level (most cautious wins)', () => {
	const result = computeSupplierDependencyPortfolio({
		relationships: [
			relationship({ supplierName: 'supplier-a', materialName: 'm1', qualifiedAlternativeAvailable: true }),
			relationship({ supplierName: 'supplier-a', materialName: 'm2', qualifiedAlternativeAvailable: false }),
		],
	});
	assert.ok(result.suppliers[0].reasonCodes.includes('NO_QUALIFIED_ALTERNATIVE'));
	assert.equal(result.suppliers[0].qualificationDependencyLevel, 'high');
});

test('portfolio summary counts single-source, qualified-single-source, and materials needing customer approval', () => {
	const result = computeSupplierDependencyPortfolio({
		relationships: [
			relationship({ supplierName: 's1', materialName: 'm1', singleSource: false }),
			relationship({ supplierName: 's2', materialName: 'm2', singleSource: true, qualifiedAlternativeAvailable: false, qualificationLeadTimeMonths: 2 }),
			relationship({ supplierName: 's3', materialName: 'm3', singleSource: true, criticalMaterial: true, qualifiedAlternativeAvailable: false, qualificationLeadTimeMonths: 9, customerApprovalRequired: true }),
		],
	});
	assert.equal(result.portfolio.totalSuppliers, 3);
	assert.equal(result.portfolio.totalRelationships, 3);
	assert.equal(result.portfolio.singleSourceMaterials, 2);
	assert.equal(result.portfolio.qualifiedSingleSourceMaterials, 2);
	assert.equal(result.portfolio.materialsRequiringCustomerApproval, 1);
	assert.equal(result.portfolio.longQualificationTimeMaterials, 1);
	assert.equal(result.portfolio.totalCriticalMaterials, 1);
});

test('supplier ranking and material ranking are kept separate, each ordered most severe first', () => {
	const result = computeSupplierDependencyPortfolio({
		relationships: [
			relationship({ supplierName: 'low-risk', materialName: 'safe-material', singleSource: false, supplierSharePercent: 10 }),
			relationship({
				supplierName: 'critical-risk',
				materialName: 'critical-material',
				singleSource: true,
				criticalMaterial: true,
				qualifiedAlternativeAvailable: false,
				qualificationLeadTimeMonths: 12,
				supplierSharePercent: 95,
			}),
		],
	});
	assert.equal(result.supplierRanking[0], 'critical-risk');
	assert.equal(result.materialRanking[0], 'critical-risk · critical-material');
	// Two independent lists — never mixed into one ambiguous ranking.
	assert.notDeepEqual(result.supplierRanking, result.materialRanking);
});

test('exposure by risk band sums annualExposureValue per material risk level; missing exposure is counted, not silently zeroed', () => {
	const result = computeSupplierDependencyPortfolio({
		relationships: [
			relationship({ supplierName: 's1', materialName: 'm1', singleSource: false, annualExposureValue: 1000 }),
			relationship({ supplierName: 's2', materialName: 'm2', singleSource: true, criticalMaterial: true, qualifiedAlternativeAvailable: false, qualificationLeadTimeMonths: 12, annualExposureValue: undefined }),
		],
	});
	assert.equal(result.portfolio.estimatedExposureByRiskBand.low, 1000);
	assert.equal(result.portfolio.relationshipsWithoutExposureData, 1);
});
