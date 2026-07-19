// Advanced Scan — one row per supplier-material relationship (Sprint 009).
// This module's own contribution is the roll-up: many rows → per-supplier
// aggregates (fed through the exact same analyzeSupplierDependency used by
// Quick Check, see advanced-engine.ts) and per-material classification,
// plus a portfolio summary and two independent rankings.

import type {
	MaterialRiskLevel,
	OverallDependencyRisk,
	ReasonCode,
	SupplierDependencyOutput,
	SupplyDependencyCondition,
} from '../../types.ts';

/** One confirmed supplier-material relationship, already typed. */
export interface SupplierMaterialRelationship {
	supplierName: string;
	materialName: string;
	materialCategory: string | undefined;
	supplierSharePercent: number | undefined;
	criticalMaterial: boolean | undefined;
	singleSource: boolean | undefined;
	alternativeSupplierAvailable: boolean | undefined;
	qualifiedAlternativeAvailable: boolean | undefined;
	qualificationRequired: boolean | undefined;
	qualificationLeadTimeMonths: number | undefined;
	customerApprovalRequired: boolean | undefined;
	trialProductionRequired: boolean | undefined;
	leadTimeDays: number | undefined;
	averageDelayDays: number | undefined;
	deliveryReliabilityPercent: number | undefined;
	agreementCancellationCount: number | undefined;
	annualUsage: number | undefined;
	annualExposureValue: number | undefined;
	optionalNotes: string | undefined;
}

export interface SupplierDependencyAdvancedInput {
	relationships: SupplierMaterialRelationship[];
}

export interface MaterialDependencyResult {
	supplierName: string;
	materialName: string;
	materialCategory: string | undefined;
	supplierSharePercent: number | undefined;
	criticalMaterial: boolean | undefined;
	singleSource: boolean | undefined;
	supplyDependencyCondition: SupplyDependencyCondition;
	qualifiedAlternativeAvailable: boolean | undefined;
	qualificationLeadTimeMonths: number | undefined;
	customerApprovalRequired: boolean | undefined;
	riskLevel: MaterialRiskLevel;
	reasonCodes: ReasonCode[];
	annualExposureValue: number | undefined;
}

/** Per-supplier roll-up: the shared SupplierDependencyOutput plus the raw aggregate counts behind it. */
export interface SupplierDependencySummary extends SupplierDependencyOutput {
	supplierName: string;
	materialCount: number;
	criticalMaterialCount: number;
	singleSourceCount: number;
	qualifiedSingleSourceCount: number;
	averageSupplierSharePercent: number;
	averageLeadTimeDays: number | undefined;
	averageDelayDays: number | undefined;
	deliveryReliabilityPercent: number | undefined;
	estimatedExposure: number | undefined;
}

export interface SupplierDependencyPortfolioSummary {
	totalSuppliers: number;
	totalRelationships: number;
	totalCriticalMaterials: number;
	singleSourceMaterials: number;
	qualifiedSingleSourceMaterials: number;
	materialsWithoutQualifiedAlternative: number;
	materialsRequiringCustomerApproval: number;
	longQualificationTimeMaterials: number;
	/** Supplier names, most dependency-critical first, capped at 5. */
	topDependencySuppliers: string[];
	/** "supplier · material", most critical first, capped at 5. */
	topCriticalMaterials: string[];
	estimatedExposureByRiskBand: Record<MaterialRiskLevel, number>;
	relationshipsWithoutExposureData: number;
}

export interface SupplierDependencyAdvancedResult {
	suppliers: SupplierDependencySummary[];
	materials: MaterialDependencyResult[];
	portfolio: SupplierDependencyPortfolioSummary;
	/** Supplier names, most severe first. */
	supplierRanking: string[];
	/** "supplier · material", most severe first. */
	materialRanking: string[];
}

export const RISK_BAND_ORDER: Record<OverallDependencyRisk, number> = { critical: 0, high: 1, moderate: 2, low: 3 };
