// Supplier Dependency & Qualification Radar engine tests (Sprint 009).
// Covers the four Key Risk Conditions, the tri-state unknown-vs-false
// distinction, the Supplier Performance ≠ Supplier Dependency separation,
// and classification boundaries.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	analyzeSupplierDependency,
	classifyMaterialRiskLevel,
	classifyQualificationDependencyLevel,
	classifySupplierDependencyLevel,
	classifySupplyDependencyCondition,
	combineOverallRisk,
	deriveSwitchingReadiness,
} from './analyze.ts';
import { DEFAULT_THRESHOLDS, type SupplierAggregateInput } from './types.ts';

function baseAggregate(overrides: Partial<SupplierAggregateInput> = {}): SupplierAggregateInput {
	return {
		supplierName: 'supplier-a',
		materialCount: 1,
		criticalMaterialCount: 0,
		supplierSharePercent: 10,
		singleSourceMaterialCount: 1,
		qualifiedSingleSourceMaterialCount: 0,
		alternativeSupplierAvailable: true,
		qualifiedAlternativeAvailable: true,
		qualificationRequired: false,
		qualificationLeadTimeMonths: 0,
		customerApprovalRequired: false,
		trialProductionRequired: false,
		averageLeadTimeDays: 10,
		averageDelayDays: 0,
		deliveryReliabilityPercent: 99,
		agreementCancellationCount: 0,
		annualExposureValue: 1000,
		estimatedSwitchingTimeOverride: undefined,
		...overrides,
	};
}

// ---- Key Risk Conditions ----

test('multi-source: singleSource false always wins, regardless of qualification fields', () => {
	const condition = classifySupplyDependencyCondition({
		singleSource: false,
		qualifiedAlternativeAvailable: false,
		criticalMaterial: true,
		qualificationLeadTimeMonths: undefined,
	});
	assert.equal(condition, 'multi-source');
});

test('single-source: singleSource true, qualified alternative available', () => {
	const condition = classifySupplyDependencyCondition({
		singleSource: true,
		qualifiedAlternativeAvailable: true,
		criticalMaterial: false,
		qualificationLeadTimeMonths: undefined,
	});
	assert.equal(condition, 'single-source');
});

test('qualified-single-source: no qualified alternative, non-critical or short qualification time', () => {
	const condition = classifySupplyDependencyCondition({
		singleSource: true,
		qualifiedAlternativeAvailable: false,
		criticalMaterial: false,
		qualificationLeadTimeMonths: 2,
	});
	assert.equal(condition, 'qualified-single-source');
});

test('critical-single-source: no qualified alternative, critical material, long qualification time', () => {
	const condition = classifySupplyDependencyCondition({
		singleSource: true,
		qualifiedAlternativeAvailable: false,
		criticalMaterial: true,
		qualificationLeadTimeMonths: 9,
	});
	assert.equal(condition, 'critical-single-source');
});

test('critical-single-source: no qualified alternative, critical material, UNKNOWN qualification time (unknown is not safe)', () => {
	const condition = classifySupplyDependencyCondition({
		singleSource: true,
		qualifiedAlternativeAvailable: false,
		criticalMaterial: true,
		qualificationLeadTimeMonths: undefined,
	});
	assert.equal(condition, 'critical-single-source');
});

test('qualified-single-source (not critical-single-source): critical material but SHORT qualification time', () => {
	const condition = classifySupplyDependencyCondition({
		singleSource: true,
		qualifiedAlternativeAvailable: false,
		criticalMaterial: true,
		qualificationLeadTimeMonths: 2,
	});
	assert.equal(condition, 'qualified-single-source');
});

test('unknown singleSource is never upgraded to multi-source (uncertainty widens caution)', () => {
	const condition = classifySupplyDependencyCondition({
		singleSource: undefined,
		qualifiedAlternativeAvailable: true,
		criticalMaterial: false,
		qualificationLeadTimeMonths: undefined,
	});
	assert.equal(condition, 'single-source');
});

test('material risk level escalates with condition and criticality', () => {
	assert.equal(classifyMaterialRiskLevel('multi-source', true), 'low');
	assert.equal(classifyMaterialRiskLevel('single-source', false), 'moderate');
	assert.equal(classifyMaterialRiskLevel('single-source', true), 'high');
	assert.equal(classifyMaterialRiskLevel('qualified-single-source', false), 'high');
	assert.equal(classifyMaterialRiskLevel('qualified-single-source', true), 'critical');
	assert.equal(classifyMaterialRiskLevel('critical-single-source', true), 'critical');
});

// ---- Switching Readiness ----

test('switching readiness: qualified alternative available → immediate (no approval/trial friction)', () => {
	assert.equal(deriveSwitchingReadiness(true, undefined, false, false), 'immediate');
});

test('switching readiness: qualified alternative available but customer approval required → within 1 month', () => {
	assert.equal(deriveSwitchingReadiness(true, undefined, true, false), 'within-1-month');
});

test('switching readiness: no qualified alternative, unknown qualification time → unknown, never immediate', () => {
	assert.equal(deriveSwitchingReadiness(false, undefined, false, false), 'unknown');
});

test('switching readiness: no qualified alternative, long qualification time → six-plus-months', () => {
	assert.equal(deriveSwitchingReadiness(false, 9, false, false), 'six-plus-months');
});

test('switching readiness: qualification status itself unknown → unknown', () => {
	assert.equal(deriveSwitchingReadiness(undefined, undefined, false, false), 'unknown');
});

test('switching readiness: explicit Quick-mode override always wins', () => {
	assert.equal(deriveSwitchingReadiness(false, 9, false, false, DEFAULT_THRESHOLDS, 'immediate'), 'immediate');
});

// ---- Supplier Dependency Level ----

test('supplier dependency level: low-risk diversified supplier', () => {
	const level = classifySupplierDependencyLevel(baseAggregate({ materialCount: 1, criticalMaterialCount: 0, supplierSharePercent: 10 }));
	assert.equal(level, 'low');
});

test('supplier dependency level: high supplier concentration alone crosses to moderate/high', () => {
	const level = classifySupplierDependencyLevel(baseAggregate({ supplierSharePercent: 90, criticalMaterialCount: 0, materialCount: 1 }));
	assert.equal(level, 'moderate');
});

test('supplier dependency level: many critical materials + severe concentration → critical', () => {
	const level = classifySupplierDependencyLevel(baseAggregate({ criticalMaterialCount: 3, supplierSharePercent: 90 }));
	assert.equal(level, 'critical');
});

test('supplier dependency level: many materials alone → high', () => {
	const level = classifySupplierDependencyLevel(baseAggregate({ materialCount: 6, supplierSharePercent: 10, criticalMaterialCount: 0 }));
	assert.equal(level, 'high');
});

// ---- Qualification Dependency Level ----

test('qualification dependency level: no qualified alternative → high', () => {
	const level = classifyQualificationDependencyLevel(baseAggregate({ qualifiedAlternativeAvailable: false, qualificationLeadTimeMonths: 2 }));
	assert.equal(level, 'high');
});

test('qualification dependency level: qualified single source + critical + long time → critical', () => {
	const level = classifyQualificationDependencyLevel(
		baseAggregate({ qualifiedSingleSourceMaterialCount: 1, criticalMaterialCount: 1, qualificationLeadTimeMonths: 9, qualifiedAlternativeAvailable: false })
	);
	assert.equal(level, 'critical');
});

test('qualification dependency level: unknown qualified-alternative status is treated as moderate, not low', () => {
	const level = classifyQualificationDependencyLevel(baseAggregate({ qualifiedAlternativeAvailable: undefined }));
	assert.equal(level, 'moderate');
});

test('qualification dependency level: customer approval or trial production required → at least moderate', () => {
	assert.equal(classifyQualificationDependencyLevel(baseAggregate({ customerApprovalRequired: true })), 'moderate');
	assert.equal(classifyQualificationDependencyLevel(baseAggregate({ trialProductionRequired: true })), 'moderate');
});

// ---- Overall risk: dependency dimensions only, performance never changes it ----

test('combineOverallRisk: takes the worse of the two dependency dimensions', () => {
	assert.equal(combineOverallRisk('low', 'high', 'immediate'), 'high');
	assert.equal(combineOverallRisk('critical', 'low', 'immediate'), 'critical');
});

test('combineOverallRisk: unknown/long switching readiness escalates one tier when already at risk', () => {
	assert.equal(combineOverallRisk('moderate', 'low', 'unknown'), 'high');
	assert.equal(combineOverallRisk('low', 'low', 'unknown'), 'low', 'no dependency risk means switching readiness alone does not manufacture risk');
});

test('Supplier Performance ≠ Supplier Dependency: poor delivery history does not change overallRisk for an otherwise low-risk supplier', () => {
	const output = analyzeSupplierDependency(
		baseAggregate({
			materialCount: 1,
			criticalMaterialCount: 0,
			supplierSharePercent: 5,
			averageDelayDays: 30,
			deliveryReliabilityPercent: 40,
			agreementCancellationCount: 3,
		})
	);
	assert.equal(output.overallRisk, 'low');
	assert.ok(output.reasonCodes.includes('HIGH_DELAY_HISTORY'));
	assert.ok(output.reasonCodes.includes('LOW_DELIVERY_RELIABILITY'));
	assert.ok(output.reasonCodes.includes('AGREEMENT_CANCELLATION_HISTORY'));
	assert.ok(output.recommendedActionCodes.includes('MONITOR_DELIVERY_PERFORMANCE'));
});

test('Supplier Performance ≠ Supplier Dependency: excellent delivery performance does not rescue a critical dependency supplier', () => {
	const output = analyzeSupplierDependency(
		baseAggregate({
			criticalMaterialCount: 3,
			supplierSharePercent: 95,
			qualifiedSingleSourceMaterialCount: 2,
			qualifiedAlternativeAvailable: false,
			qualificationLeadTimeMonths: undefined,
			averageDelayDays: 0,
			deliveryReliabilityPercent: 100,
			agreementCancellationCount: 0,
		})
	);
	assert.equal(output.overallRisk, 'critical');
});

// ---- End-to-end scenarios from the Sprint 009 spec ----

test('low-risk diversified supplier: acceptable dependency, no warning', () => {
	const output = analyzeSupplierDependency(
		baseAggregate({ materialCount: 2, criticalMaterialCount: 0, supplierSharePercent: 15, singleSourceMaterialCount: 0, qualifiedSingleSourceMaterialCount: 0 })
	);
	assert.equal(output.overallRisk, 'low');
	assert.equal(output.primaryWarningCode, undefined);
	assert.deepEqual(output.reasonCodes, ['DEPENDENCY_ACCEPTABLE']);
	assert.deepEqual(output.recommendedActionCodes, ['NO_IMMEDIATE_ACTION']);
});

test('high supplier concentration: HIGH_SUPPLIER_SHARE reason and REDUCE_SUPPLIER_CONCENTRATION action', () => {
	const output = analyzeSupplierDependency(baseAggregate({ supplierSharePercent: 95, criticalMaterialCount: 2, materialCount: 6 }));
	assert.ok(output.reasonCodes.includes('HIGH_SUPPLIER_SHARE'));
	assert.ok(output.recommendedActionCodes.includes('REDUCE_SUPPLIER_CONCENTRATION'));
});

test('single source: HIGH_SINGLE_SOURCE_COUNT and CREATE_SECOND_SOURCE_PLAN', () => {
	const output = analyzeSupplierDependency(baseAggregate({ singleSourceMaterialCount: 3, supplierSharePercent: 20 }));
	assert.ok(output.reasonCodes.includes('HIGH_SINGLE_SOURCE_COUNT'));
	assert.ok(output.recommendedActionCodes.includes('CREATE_SECOND_SOURCE_PLAN'));
});

test('qualified single source: stronger effect than ordinary single source — QUALIFIED_SINGLE_SOURCE + START_ALTERNATIVE_QUALIFICATION', () => {
	const output = analyzeSupplierDependency(
		baseAggregate({ singleSourceMaterialCount: 1, qualifiedSingleSourceMaterialCount: 1, qualifiedAlternativeAvailable: false, qualificationLeadTimeMonths: 2 })
	);
	assert.ok(output.reasonCodes.includes('QUALIFIED_SINGLE_SOURCE'));
	assert.ok(output.recommendedActionCodes.includes('START_ALTERNATIVE_QUALIFICATION'));
	assert.equal(output.qualificationDependencyLevel, 'high');
});

test('critical single source is one of the highest-risk conditions: overallRisk critical', () => {
	const output = analyzeSupplierDependency(
		baseAggregate({
			criticalMaterialCount: 1,
			qualifiedSingleSourceMaterialCount: 1,
			singleSourceMaterialCount: 1,
			qualifiedAlternativeAvailable: false,
			qualificationLeadTimeMonths: undefined,
			customerApprovalRequired: true,
		})
	);
	assert.equal(output.overallRisk, 'critical');
	assert.equal(output.criticalExposure, true);
	assert.equal(output.primaryWarningCode, 'SUPPLIER_DEP_WARNING_CRITICAL');
});

test('no qualified alternative: NO_QUALIFIED_ALTERNATIVE reason present', () => {
	const output = analyzeSupplierDependency(baseAggregate({ qualifiedAlternativeAvailable: false, qualificationLeadTimeMonths: 1 }));
	assert.ok(output.reasonCodes.includes('NO_QUALIFIED_ALTERNATIVE'));
});

test('long qualification time: LONG_QUALIFICATION_TIME reason and LONG_SWITCHING_TIME', () => {
	const output = analyzeSupplierDependency(baseAggregate({ qualifiedAlternativeAvailable: false, qualificationLeadTimeMonths: 9 }));
	assert.ok(output.reasonCodes.includes('LONG_QUALIFICATION_TIME'));
	assert.ok(output.reasonCodes.includes('LONG_SWITCHING_TIME'));
});

test('unknown qualification time: UNKNOWN_QUALIFICATION_TIME reason, not treated as zero risk', () => {
	const output = analyzeSupplierDependency(baseAggregate({ qualifiedAlternativeAvailable: false, qualificationLeadTimeMonths: undefined }));
	assert.ok(output.reasonCodes.includes('UNKNOWN_QUALIFICATION_TIME'));
	assert.equal(output.switchingReadiness, 'unknown');
});

test('customer approval required: CUSTOMER_APPROVAL_REQUIRED reason and REVIEW_CUSTOMER_APPROVAL_PATH action', () => {
	const output = analyzeSupplierDependency(baseAggregate({ customerApprovalRequired: true }));
	assert.ok(output.reasonCodes.includes('CUSTOMER_APPROVAL_REQUIRED'));
	assert.ok(output.recommendedActionCodes.includes('REVIEW_CUSTOMER_APPROVAL_PATH'));
});

test('trial production required: TRIAL_PRODUCTION_REQUIRED reason', () => {
	const output = analyzeSupplierDependency(baseAggregate({ trialProductionRequired: true }));
	assert.ok(output.reasonCodes.includes('TRIAL_PRODUCTION_REQUIRED'));
});

test('multiple critical materials: MULTIPLE_CRITICAL_MATERIALS reason', () => {
	const output = analyzeSupplierDependency(baseAggregate({ criticalMaterialCount: 3 }));
	assert.ok(output.reasonCodes.includes('MULTIPLE_CRITICAL_MATERIALS'));
});

test('high delay history: HIGH_DELAY_HISTORY reason', () => {
	const output = analyzeSupplierDependency(baseAggregate({ averageDelayDays: 20 }));
	assert.ok(output.reasonCodes.includes('HIGH_DELAY_HISTORY'));
});

test('low delivery reliability: LOW_DELIVERY_RELIABILITY reason', () => {
	const output = analyzeSupplierDependency(baseAggregate({ deliveryReliabilityPercent: 70 }));
	assert.ok(output.reasonCodes.includes('LOW_DELIVERY_RELIABILITY'));
});

test('agreement cancellation history: AGREEMENT_CANCELLATION_HISTORY reason', () => {
	const output = analyzeSupplierDependency(baseAggregate({ agreementCancellationCount: 2 }));
	assert.ok(output.reasonCodes.includes('AGREEMENT_CANCELLATION_HISTORY'));
});

test('high exposure value: HIGH_EXPOSURE_VALUE reason', () => {
	const output = analyzeSupplierDependency(baseAggregate({ annualExposureValue: 500000 }));
	assert.ok(output.reasonCodes.includes('HIGH_EXPOSURE_VALUE'));
});

test('long lead time: LONG_LEAD_TIME reason', () => {
	const output = analyzeSupplierDependency(baseAggregate({ averageLeadTimeDays: 90 }));
	assert.ok(output.reasonCodes.includes('LONG_LEAD_TIME'));
});

test('regression: zero single-source materials means qualification/switching fields are inapplicable, not uncertain — blank does not manufacture risk', () => {
	const output = analyzeSupplierDependency(
		baseAggregate({
			materialCount: 2,
			criticalMaterialCount: 0,
			supplierSharePercent: 15,
			singleSourceMaterialCount: 0,
			qualifiedSingleSourceMaterialCount: 0,
			qualifiedAlternativeAvailable: undefined,
			qualificationLeadTimeMonths: undefined,
			customerApprovalRequired: undefined,
		})
	);
	assert.equal(output.overallRisk, 'low');
	assert.equal(output.supplyDependencyCondition, 'multi-source');
	assert.equal(output.switchingReadiness, 'immediate');
	assert.ok(!output.reasonCodes.includes('UNKNOWN_QUALIFICATION_TIME'));
	assert.ok(!output.reasonCodes.includes('LONG_SWITCHING_TIME'));
});

test('engine is a pure function of its input — same input, same output', () => {
	const input = baseAggregate({ criticalMaterialCount: 2, supplierSharePercent: 70, qualifiedAlternativeAvailable: false });
	assert.deepEqual(analyzeSupplierDependency(input), analyzeSupplierDependency(input));
});
