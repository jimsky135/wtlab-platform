// Supplier Dependency & Qualification Radar — engine v0.1 (Sprint 009).
// Transparent, deterministic, rule-based: every classification is a
// documented first-match check against DEFAULT_THRESHOLDS, never a hidden
// weighted score. `dependencyScore` is a supplementary, fully-documented
// tie-break number for ranking only — it never drives classification.
//
// Unknown vs false: every optional boolean/number field is `undefined` when
// unknown and a real value otherwise. Unknown is never treated as safe —
// see deriveSwitchingReadiness and classifyQualificationDependencyLevel.
//
// Supplier Performance vs Supplier Dependency (spec's core principle):
// delay history, delivery reliability, and cancellation history surface as
// their own reason codes/actions but never change supplierDependencyLevel,
// qualificationDependencyLevel, or overallRisk — see combineOverallRisk.

import type { MessageCode } from '../../platform/message-codes.ts';
import {
	DEFAULT_THRESHOLDS,
	type MaterialRiskLevel,
	type OverallDependencyRisk,
	type QualificationDependencyLevel,
	type ReasonCode,
	type RecommendedActionId,
	type SupplierAggregateInput,
	type SupplierDependencyLevel,
	type SupplierDependencyOutput,
	type SupplierDependencyThresholds,
	type SupplyDependencyCondition,
	type SwitchingReadiness,
} from './types.ts';

const SEVERITY_RANK: Record<'low' | 'moderate' | 'high' | 'critical', number> = {
	low: 0,
	moderate: 1,
	high: 2,
	critical: 3,
};
const RANK_TO_LEVEL: Array<'low' | 'moderate' | 'high' | 'critical'> = ['low', 'moderate', 'high', 'critical'];

/** Inputs needed to classify a single supplier-material relationship's Key Risk Condition. */
export interface SupplyConditionInput {
	singleSource: boolean | undefined;
	qualifiedAlternativeAvailable: boolean | undefined;
	criticalMaterial: boolean | undefined;
	qualificationLeadTimeMonths: number | undefined;
}

/**
 * The four Key Risk Conditions. `singleSource`/`qualifiedAlternativeAvailable`
 * unknown are treated as their own bucket, never silently upgraded to
 * "multi-source" or downgraded away from a single-source condition —
 * uncertainty widens caution, it never falsely reduces risk.
 */
export function classifySupplyDependencyCondition(
	input: SupplyConditionInput,
	thresholds: SupplierDependencyThresholds = DEFAULT_THRESHOLDS
): SupplyDependencyCondition {
	if (input.singleSource === false) return 'multi-source';

	if (input.qualifiedAlternativeAvailable === false) {
		const longOrUnknownQualTime =
			input.qualificationLeadTimeMonths === undefined ||
			input.qualificationLeadTimeMonths >= thresholds.longQualificationMonths;
		if (input.criticalMaterial === true && longOrUnknownQualTime) return 'critical-single-source';
		return 'qualified-single-source';
	}

	// singleSource true/unknown, qualifiedAlternativeAvailable true/unknown.
	return 'single-source';
}

export function classifyMaterialRiskLevel(
	condition: SupplyDependencyCondition,
	criticalMaterial: boolean | undefined
): MaterialRiskLevel {
	if (condition === 'critical-single-source') return 'critical';
	if (condition === 'qualified-single-source') return criticalMaterial === true ? 'critical' : 'high';
	if (condition === 'single-source') return criticalMaterial === true ? 'high' : 'moderate';
	return 'low';
}

/**
 * Switching Dependency dimension. An explicit user estimate (Quick mode
 * only) always wins. Otherwise derived from qualification state: an already
 * -qualified alternative switches fast (friction only from approval/trial);
 * no qualified alternative means switching requires full qualification, so
 * the estimate follows qualification lead time; unknown qualification status
 * means switching readiness is itself unknown — never assumed immediate.
 */
export function deriveSwitchingReadiness(
	qualifiedAlternativeAvailable: boolean | undefined,
	qualificationLeadTimeMonths: number | undefined,
	customerApprovalRequired: boolean | undefined,
	trialProductionRequired: boolean | undefined,
	thresholds: SupplierDependencyThresholds = DEFAULT_THRESHOLDS,
	override?: SwitchingReadiness
): SwitchingReadiness {
	if (override !== undefined) return override;

	if (qualifiedAlternativeAvailable === true) {
		return customerApprovalRequired === true || trialProductionRequired === true ? 'within-1-month' : 'immediate';
	}

	if (qualifiedAlternativeAvailable === false) {
		if (qualificationLeadTimeMonths === undefined) return 'unknown';
		if (qualificationLeadTimeMonths <= 1) return 'within-1-month';
		if (qualificationLeadTimeMonths <= 3) return 'within-3-months';
		if (qualificationLeadTimeMonths < thresholds.longQualificationMonths) return 'within-3-months';
		return 'six-plus-months';
	}

	return 'unknown';
}

/** Supplier Dependency dimension: breadth/concentration of what depends on this supplier. */
export function classifySupplierDependencyLevel(
	input: SupplierAggregateInput,
	thresholds: SupplierDependencyThresholds = DEFAULT_THRESHOLDS
): SupplierDependencyLevel {
	const severeConcentration = input.supplierSharePercent >= thresholds.criticalSupplierSharePercent;
	const highConcentration = input.supplierSharePercent >= thresholds.highSupplierSharePercent;
	const manyCritical = input.criticalMaterialCount >= thresholds.manyCriticalMaterialsCount;
	const manyMaterials = input.materialCount >= thresholds.manyMaterialsCount;

	if (manyCritical && severeConcentration) return 'critical';
	if ((input.criticalMaterialCount >= 1 && highConcentration) || manyMaterials) return 'high';
	if (highConcentration || input.criticalMaterialCount >= 1) return 'moderate';
	return 'low';
}

/** Qualification Dependency dimension: can an alternative actually be used? */
export function classifyQualificationDependencyLevel(
	input: SupplierAggregateInput,
	thresholds: SupplierDependencyThresholds = DEFAULT_THRESHOLDS
): QualificationDependencyLevel {
	const longOrUnknownQualTime =
		input.qualificationLeadTimeMonths === undefined || input.qualificationLeadTimeMonths >= thresholds.longQualificationMonths;

	if (input.qualifiedSingleSourceMaterialCount >= 1 && input.criticalMaterialCount >= 1 && longOrUnknownQualTime) {
		return 'critical';
	}
	if (input.qualifiedSingleSourceMaterialCount >= 1 || input.qualifiedAlternativeAvailable === false) {
		return 'high';
	}
	if (
		input.singleSourceMaterialCount >= thresholds.manySingleSourceCount ||
		input.qualificationRequired === true ||
		input.customerApprovalRequired === true ||
		input.trialProductionRequired === true ||
		// Alternative-availability is only a meaningful uncertainty when a
		// single-source material actually exists to need one — otherwise
		// leaving it blank is not a risk signal, just an inapplicable field.
		(input.singleSourceMaterialCount >= 1 && input.qualifiedAlternativeAvailable === undefined)
	) {
		return 'moderate';
	}
	return 'low';
}

/**
 * Combines the three true dependency dimensions into one overall risk.
 * Deliberately excludes performance signals (delay/reliability/cancellation)
 * — those stay reason codes/actions only, per the spec's Supplier
 * Performance ≠ Supplier Dependency principle.
 */
export function combineOverallRisk(
	supplierDependencyLevel: SupplierDependencyLevel,
	qualificationDependencyLevel: QualificationDependencyLevel,
	switchingReadiness: SwitchingReadiness
): OverallDependencyRisk {
	let rank = Math.max(SEVERITY_RANK[supplierDependencyLevel], SEVERITY_RANK[qualificationDependencyLevel]);
	if (rank >= SEVERITY_RANK.moderate && (switchingReadiness === 'six-plus-months' || switchingReadiness === 'unknown')) {
		rank = Math.min(SEVERITY_RANK.critical, rank + 1);
	}
	return RANK_TO_LEVEL[rank];
}

/** Material-row-scoped reason codes — same checks as the supplier-level assembler minus the portfolio-breadth codes (MULTIPLE_*), which only make sense aggregated across rows. */
export function assembleMaterialReasonCodes(
	row: {
		supplierSharePercent: number | undefined;
		singleSource: boolean | undefined;
		alternativeSupplierAvailable: boolean | undefined;
		qualifiedAlternativeAvailable: boolean | undefined;
		qualificationRequired: boolean | undefined;
		qualificationLeadTimeMonths: number | undefined;
		customerApprovalRequired: boolean | undefined;
		trialProductionRequired: boolean | undefined;
		averageDelayDays: number | undefined;
		deliveryReliabilityPercent: number | undefined;
		agreementCancellationCount: number | undefined;
		leadTimeDays: number | undefined;
		annualExposureValue: number | undefined;
	},
	switchingReadiness: SwitchingReadiness,
	thresholds: SupplierDependencyThresholds = DEFAULT_THRESHOLDS
): ReasonCode[] {
	const reasons: ReasonCode[] = [];
	if (row.supplierSharePercent !== undefined && row.supplierSharePercent >= thresholds.highSupplierSharePercent) reasons.push('HIGH_SUPPLIER_SHARE');
	if (row.alternativeSupplierAvailable === false) reasons.push('NO_ALTERNATIVE_SUPPLIER');
	if (row.qualifiedAlternativeAvailable === false) reasons.push('NO_QUALIFIED_ALTERNATIVE');
	if (row.qualificationRequired === true) reasons.push('QUALIFICATION_REQUIRED');
	if (row.qualificationLeadTimeMonths !== undefined && row.qualificationLeadTimeMonths >= thresholds.longQualificationMonths) {
		reasons.push('LONG_QUALIFICATION_TIME');
	}
	if (row.singleSource !== false && row.qualifiedAlternativeAvailable !== true && row.qualificationLeadTimeMonths === undefined) {
		reasons.push('UNKNOWN_QUALIFICATION_TIME');
	}
	if (row.customerApprovalRequired === true) reasons.push('CUSTOMER_APPROVAL_REQUIRED');
	if (row.trialProductionRequired === true) reasons.push('TRIAL_PRODUCTION_REQUIRED');
	if (switchingReadiness === 'six-plus-months') reasons.push('LONG_SWITCHING_TIME');
	if (row.averageDelayDays !== undefined && row.averageDelayDays >= thresholds.highDelayDays) reasons.push('HIGH_DELAY_HISTORY');
	if (row.deliveryReliabilityPercent !== undefined && row.deliveryReliabilityPercent < thresholds.lowDeliveryReliabilityPercent) {
		reasons.push('LOW_DELIVERY_RELIABILITY');
	}
	if (row.agreementCancellationCount !== undefined && row.agreementCancellationCount >= thresholds.cancellationHistoryThreshold) {
		reasons.push('AGREEMENT_CANCELLATION_HISTORY');
	}
	if (row.leadTimeDays !== undefined && row.leadTimeDays >= thresholds.longLeadTimeDays) reasons.push('LONG_LEAD_TIME');
	if (row.annualExposureValue !== undefined && row.annualExposureValue >= thresholds.highExposureValue) reasons.push('HIGH_EXPOSURE_VALUE');
	if (reasons.length === 0) reasons.push('DEPENDENCY_ACCEPTABLE');
	return reasons;
}

function assembleReasonCodes(
	input: SupplierAggregateInput,
	switchingReadiness: SwitchingReadiness,
	thresholds: SupplierDependencyThresholds
): ReasonCode[] {
	const reasons: ReasonCode[] = [];
	if (input.supplierSharePercent >= thresholds.highSupplierSharePercent) reasons.push('HIGH_SUPPLIER_SHARE');
	if (input.materialCount >= thresholds.manyMaterialsCount) reasons.push('MULTIPLE_MATERIAL_DEPENDENCY');
	if (input.criticalMaterialCount >= thresholds.manyCriticalMaterialsCount) reasons.push('MULTIPLE_CRITICAL_MATERIALS');
	if (input.singleSourceMaterialCount >= thresholds.manySingleSourceCount) reasons.push('HIGH_SINGLE_SOURCE_COUNT');
	if (input.qualifiedSingleSourceMaterialCount >= 1) reasons.push('QUALIFIED_SINGLE_SOURCE');
	if (input.alternativeSupplierAvailable === false) reasons.push('NO_ALTERNATIVE_SUPPLIER');
	if (input.qualifiedAlternativeAvailable === false) reasons.push('NO_QUALIFIED_ALTERNATIVE');
	if (input.qualificationRequired === true) reasons.push('QUALIFICATION_REQUIRED');
	if (input.qualificationLeadTimeMonths !== undefined && input.qualificationLeadTimeMonths >= thresholds.longQualificationMonths) {
		reasons.push('LONG_QUALIFICATION_TIME');
	}
	if (input.singleSourceMaterialCount >= 1 && input.qualifiedAlternativeAvailable !== true && input.qualificationLeadTimeMonths === undefined) {
		reasons.push('UNKNOWN_QUALIFICATION_TIME');
	}
	if (input.customerApprovalRequired === true) reasons.push('CUSTOMER_APPROVAL_REQUIRED');
	if (input.trialProductionRequired === true) reasons.push('TRIAL_PRODUCTION_REQUIRED');
	if (switchingReadiness === 'six-plus-months') reasons.push('LONG_SWITCHING_TIME');
	if (input.averageDelayDays !== undefined && input.averageDelayDays >= thresholds.highDelayDays) reasons.push('HIGH_DELAY_HISTORY');
	if (input.deliveryReliabilityPercent !== undefined && input.deliveryReliabilityPercent < thresholds.lowDeliveryReliabilityPercent) {
		reasons.push('LOW_DELIVERY_RELIABILITY');
	}
	if (input.agreementCancellationCount !== undefined && input.agreementCancellationCount >= thresholds.cancellationHistoryThreshold) {
		reasons.push('AGREEMENT_CANCELLATION_HISTORY');
	}
	if (input.averageLeadTimeDays !== undefined && input.averageLeadTimeDays >= thresholds.longLeadTimeDays) reasons.push('LONG_LEAD_TIME');
	if (input.annualExposureValue !== undefined && input.annualExposureValue >= thresholds.highExposureValue) reasons.push('HIGH_EXPOSURE_VALUE');
	if (reasons.length === 0) reasons.push('DEPENDENCY_ACCEPTABLE');
	return reasons;
}

function assembleRecommendedActions(
	overallRisk: OverallDependencyRisk,
	qualificationDependencyLevel: QualificationDependencyLevel,
	supplierDependencyLevel: SupplierDependencyLevel,
	switchingReadiness: SwitchingReadiness,
	input: SupplierAggregateInput,
	reasons: ReasonCode[]
): RecommendedActionId[] {
	const actions: RecommendedActionId[] = [];
	if (overallRisk === 'critical' || qualificationDependencyLevel === 'high' || qualificationDependencyLevel === 'critical') {
		actions.push('START_ALTERNATIVE_QUALIFICATION');
	}
	if (supplierDependencyLevel === 'high' || supplierDependencyLevel === 'critical') {
		actions.push('REDUCE_SUPPLIER_CONCENTRATION');
	}
	if (input.singleSourceMaterialCount >= 1 && !actions.includes('START_ALTERNATIVE_QUALIFICATION')) {
		actions.push('CREATE_SECOND_SOURCE_PLAN');
	}
	if (input.customerApprovalRequired === true) actions.push('REVIEW_CUSTOMER_APPROVAL_PATH');
	if (overallRisk !== 'low' && (switchingReadiness === 'six-plus-months' || switchingReadiness === 'unknown')) {
		actions.push('BUILD_TEMPORARY_BUFFER');
	}
	if (reasons.includes('HIGH_DELAY_HISTORY') || reasons.includes('LOW_DELIVERY_RELIABILITY') || reasons.includes('AGREEMENT_CANCELLATION_HISTORY')) {
		actions.push('MONITOR_DELIVERY_PERFORMANCE');
	}
	if (actions.length === 0) actions.push('NO_IMMEDIATE_ACTION');
	return actions;
}

/**
 * Supplementary tie-break score — every weight below is a documented
 * constant, never used to derive overallRisk/level classifications, only to
 * order rankings when severities tie.
 */
export function computeDependencyScore(input: SupplierAggregateInput, switchingReadiness: SwitchingReadiness): number {
	let score = 0;
	score += input.materialCount * 2;
	score += input.criticalMaterialCount * 10;
	score += input.supplierSharePercent;
	score += input.singleSourceMaterialCount * 8;
	score += input.qualifiedSingleSourceMaterialCount * 15;
	score += input.qualifiedAlternativeAvailable === false ? 20 : input.qualifiedAlternativeAvailable === undefined ? 10 : 0;
	score += input.customerApprovalRequired === true ? 5 : 0;
	score += input.trialProductionRequired === true ? 5 : 0;
	score += switchingReadiness === 'six-plus-months' ? 15 : switchingReadiness === 'unknown' ? 10 : 0;
	score += (input.averageDelayDays ?? 0) * 0.5;
	score += (input.agreementCancellationCount ?? 0) * 5;
	if (input.deliveryReliabilityPercent !== undefined) score += (100 - input.deliveryReliabilityPercent) * 0.3;
	return Math.round(score * 100) / 100;
}

const PRIMARY_WARNING_CODE: Record<OverallDependencyRisk, MessageCode | undefined> = {
	low: undefined,
	moderate: 'SUPPLIER_DEP_WARNING_MODERATE',
	high: 'SUPPLIER_DEP_WARNING_HIGH',
	critical: 'SUPPLIER_DEP_WARNING_CRITICAL',
};

/** Maps the stable, CSV-exported RecommendedActionId to its localized presentation. */
export const RECOMMENDED_ACTION_MESSAGE_CODE: Record<RecommendedActionId, MessageCode> = {
	START_ALTERNATIVE_QUALIFICATION: 'SUPPLIER_DEP_ACTION_START_ALTERNATIVE_QUALIFICATION',
	REDUCE_SUPPLIER_CONCENTRATION: 'SUPPLIER_DEP_ACTION_REDUCE_SUPPLIER_CONCENTRATION',
	CREATE_SECOND_SOURCE_PLAN: 'SUPPLIER_DEP_ACTION_CREATE_SECOND_SOURCE_PLAN',
	REVIEW_CUSTOMER_APPROVAL_PATH: 'SUPPLIER_DEP_ACTION_REVIEW_CUSTOMER_APPROVAL_PATH',
	BUILD_TEMPORARY_BUFFER: 'SUPPLIER_DEP_ACTION_BUILD_TEMPORARY_BUFFER',
	MONITOR_DELIVERY_PERFORMANCE: 'SUPPLIER_DEP_ACTION_MONITOR_DELIVERY_PERFORMANCE',
	NO_IMMEDIATE_ACTION: 'SUPPLIER_DEP_ACTION_NO_IMMEDIATE_ACTION',
};

export function analyzeSupplierDependency(
	input: SupplierAggregateInput,
	thresholds: SupplierDependencyThresholds = DEFAULT_THRESHOLDS
): SupplierDependencyOutput {
	const supplierDependencyLevel = classifySupplierDependencyLevel(input, thresholds);
	const qualificationDependencyLevel = classifyQualificationDependencyLevel(input, thresholds);
	// Switching Dependency is only meaningful when a single-source material
	// actually exists — with zero, there is nothing to switch away from, and
	// leaving qualification fields blank is an inapplicable field, not
	// uncertainty. estimatedSwitchingTimeOverride still wins either way.
	const switchingReadiness =
		input.singleSourceMaterialCount >= 1
			? deriveSwitchingReadiness(
					input.qualifiedAlternativeAvailable,
					input.qualificationLeadTimeMonths,
					input.customerApprovalRequired,
					input.trialProductionRequired,
					thresholds,
					input.estimatedSwitchingTimeOverride
				)
			: (input.estimatedSwitchingTimeOverride ?? 'immediate');
	const overallRisk = combineOverallRisk(supplierDependencyLevel, qualificationDependencyLevel, switchingReadiness);
	const supplyDependencyCondition = classifySupplyDependencyCondition(
		{
			// materialCount/singleSourceMaterialCount are required Quick fields,
			// so this is always a confident true/false, never itself unknown.
			singleSource: input.singleSourceMaterialCount >= 1,
			qualifiedAlternativeAvailable: input.qualifiedAlternativeAvailable,
			criticalMaterial: input.criticalMaterialCount >= 1,
			qualificationLeadTimeMonths: input.qualificationLeadTimeMonths,
		},
		thresholds
	);
	const criticalExposure = input.qualifiedSingleSourceMaterialCount >= 1 && input.criticalMaterialCount >= 1;
	const reasonCodes = assembleReasonCodes(input, switchingReadiness, thresholds);
	const recommendedActionCodes = assembleRecommendedActions(
		overallRisk,
		qualificationDependencyLevel,
		supplierDependencyLevel,
		switchingReadiness,
		input,
		reasonCodes
	);
	const dependencyScore = computeDependencyScore(input, switchingReadiness);

	return {
		overallRisk,
		supplierDependencyLevel,
		qualificationDependencyLevel,
		switchingReadiness,
		criticalExposure,
		supplyDependencyCondition,
		dependencyScore,
		reasonCodes,
		primaryWarningCode: PRIMARY_WARNING_CODE[overallRisk],
		recommendedActionCodes,
	};
}
