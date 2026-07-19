// Supplier Dependency & Qualification Radar — instrument types (Sprint 009,
// sixth production instrument). Core principle: supplier risk is modeled as
// Supplier × Material relationships, not one opaque per-supplier score.
// Four dependency dimensions stay separate and explainable rather than being
// collapsed into a single number (see docs/engineering.md Sprint 009 entry):
//   1. Supplier Dependency     — breadth/concentration of what depends on this supplier
//   2. Supply Dependency       — can the material be bought elsewhere at all (per material)
//   3. Qualification Dependency — can an alternative actually be USED (qualified, approved)
//   4. Switching Dependency    — how fast could the company actually switch
// Supplier Performance (delay history, reliability, cancellations) is tracked
// as separate reason codes/actions and never allowed to change the dependency
// classification — see combineOverallRisk in analyze.ts.

import type { MessageCode } from '../../platform/message-codes.ts';

export type SupplierDependencyLevel = 'low' | 'moderate' | 'high' | 'critical';
export type QualificationDependencyLevel = 'low' | 'moderate' | 'high' | 'critical';
export type OverallDependencyRisk = 'low' | 'moderate' | 'high' | 'critical';
export type MaterialRiskLevel = 'low' | 'moderate' | 'high' | 'critical';

/** Explicit user-declared or engine-derived switching estimate. 'unknown' is a real value, never treated as safe. */
export type SwitchingReadiness = 'immediate' | 'within-1-month' | 'within-3-months' | 'six-plus-months' | 'unknown';

/** The four Key Risk Conditions (Sprint 009 spec), most severe last. */
export type SupplyDependencyCondition =
	| 'multi-source'
	| 'single-source'
	| 'qualified-single-source'
	| 'critical-single-source';

/**
 * Stable, locale-neutral reason vocabulary — shown RAW in the UI and CSV,
 * same convention as every prior instrument's reasonCodes (never translated).
 */
export type ReasonCode =
	| 'HIGH_SUPPLIER_SHARE'
	| 'MULTIPLE_MATERIAL_DEPENDENCY'
	| 'MULTIPLE_CRITICAL_MATERIALS'
	| 'HIGH_SINGLE_SOURCE_COUNT'
	| 'QUALIFIED_SINGLE_SOURCE'
	| 'NO_ALTERNATIVE_SUPPLIER'
	| 'NO_QUALIFIED_ALTERNATIVE'
	| 'QUALIFICATION_REQUIRED'
	| 'LONG_QUALIFICATION_TIME'
	| 'UNKNOWN_QUALIFICATION_TIME'
	| 'CUSTOMER_APPROVAL_REQUIRED'
	| 'TRIAL_PRODUCTION_REQUIRED'
	| 'LONG_SWITCHING_TIME'
	| 'HIGH_DELAY_HISTORY'
	| 'LOW_DELIVERY_RELIABILITY'
	| 'AGREEMENT_CANCELLATION_HISTORY'
	| 'LONG_LEAD_TIME'
	| 'HIGH_EXPOSURE_VALUE'
	| 'DEPENDENCY_ACCEPTABLE';

/**
 * Stable recommended-action vocabulary. Exported raw in CSV (per spec: "Use
 * stable codes + params + localized presentation" — never translated prose
 * from engine logic). Presentation resolves each id through a MessageCode,
 * see RECOMMENDED_ACTION_MESSAGE_CODE in analyze.ts.
 */
export type RecommendedActionId =
	| 'START_ALTERNATIVE_QUALIFICATION'
	| 'REDUCE_SUPPLIER_CONCENTRATION'
	| 'CREATE_SECOND_SOURCE_PLAN'
	| 'REVIEW_CUSTOMER_APPROVAL_PATH'
	| 'BUILD_TEMPORARY_BUFFER'
	| 'MONITOR_DELIVERY_PERFORMANCE'
	| 'NO_IMMEDIATE_ACTION';

/**
 * Explicit, documented v0.1 thresholds — no hidden weighting. All
 * classification is first-match rule evaluation against these values.
 */
export interface SupplierDependencyThresholds {
	/** Supplier share (%) at/above this is a concentration concern. */
	highSupplierSharePercent: number;
	/** Supplier share (%) at/above this is a severe concentration concern. */
	criticalSupplierSharePercent: number;
	/** Material count at/above this counts as broad portfolio dependency. */
	manyMaterialsCount: number;
	/** Critical material count at/above this counts as broad critical dependency. */
	manyCriticalMaterialsCount: number;
	/** Single-source material count at/above this is itself a reason code. */
	manySingleSourceCount: number;
	/** Qualification lead time (months) at/above this is "long". */
	longQualificationMonths: number;
	/** Delivery reliability (%) below this is a performance concern. */
	lowDeliveryReliabilityPercent: number;
	/** Average delay (days) at/above this is a performance concern. */
	highDelayDays: number;
	/** Agreement cancellation count at/above this is notable history. */
	cancellationHistoryThreshold: number;
	/** Lead time (days) at/above this is "long". */
	longLeadTimeDays: number;
	/** Annual exposure value at/above this is flagged as high exposure. */
	highExposureValue: number;
}

export const DEFAULT_THRESHOLDS: SupplierDependencyThresholds = {
	highSupplierSharePercent: 50,
	criticalSupplierSharePercent: 80,
	manyMaterialsCount: 5,
	manyCriticalMaterialsCount: 2,
	manySingleSourceCount: 2,
	longQualificationMonths: 6,
	lowDeliveryReliabilityPercent: 90,
	highDelayDays: 14,
	cancellationHistoryThreshold: 1,
	longLeadTimeDays: 60,
	highExposureValue: 100000,
};

// ---------- Quick Check (one supplier, portfolio-aggregate counts) ----------

export interface SupplierDependencyQuickRawInput {
	supplierName: string;
	materialCount: string;
	criticalMaterialCount: string;
	supplierSharePercent: string;
	singleSourceMaterialCount: string;
	qualifiedSingleSourceMaterialCount: string;
	alternativeSupplierAvailable: string;
	qualifiedAlternativeAvailable: string;
	qualificationRequired: string;
	qualificationLeadTimeMonths: string;
	customerApprovalRequired: string;
	trialProductionRequired: string;
	averageLeadTimeDays: string;
	averageDelayDays: string;
	deliveryReliabilityPercent: string;
	agreementCancellationCount: string;
	annualExposureValue: string;
	estimatedSwitchingTime: string;
	notes: string;
}

/** Common aggregate shape the engine classifies — shared by Quick (one row) and Advanced (rolled up per supplier). */
export interface SupplierAggregateInput {
	supplierName: string;
	materialCount: number;
	criticalMaterialCount: number;
	supplierSharePercent: number;
	singleSourceMaterialCount: number;
	qualifiedSingleSourceMaterialCount: number;
	alternativeSupplierAvailable: boolean | undefined;
	qualifiedAlternativeAvailable: boolean | undefined;
	qualificationRequired: boolean | undefined;
	qualificationLeadTimeMonths: number | undefined;
	customerApprovalRequired: boolean | undefined;
	trialProductionRequired: boolean | undefined;
	averageLeadTimeDays: number | undefined;
	averageDelayDays: number | undefined;
	deliveryReliabilityPercent: number | undefined;
	agreementCancellationCount: number | undefined;
	annualExposureValue: number | undefined;
	/** Explicit user override (Quick only). Undefined lets the engine derive it. */
	estimatedSwitchingTimeOverride: SwitchingReadiness | undefined;
}

export type SupplierDependencyQuickValidatedInput = SupplierAggregateInput;

export interface SupplierDependencyOutput {
	overallRisk: OverallDependencyRisk;
	supplierDependencyLevel: SupplierDependencyLevel;
	qualificationDependencyLevel: QualificationDependencyLevel;
	switchingReadiness: SwitchingReadiness;
	/** True when at least one critical material sits on a qualified-single-source or worse condition. */
	criticalExposure: boolean;
	/** Worst-case Key Risk Condition implied by the aggregate counts. */
	supplyDependencyCondition: SupplyDependencyCondition;
	/** Supplementary, documented tie-break score — never the sole output, never drives classification. */
	dependencyScore: number;
	reasonCodes: ReasonCode[];
	primaryWarningCode: MessageCode | undefined;
	recommendedActionCodes: RecommendedActionId[];
}
