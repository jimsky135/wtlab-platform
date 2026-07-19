// Advanced Scan portfolio engine (Sprint 009). Rolls many supplier-material
// relationships up to per-supplier aggregates and feeds them through the
// exact same analyzeSupplierDependency used by Quick Check — one
// classification function, not duplicated (same discipline as Buffer
// Drift's projection.ts reusing classifyDrift). This module's own
// contribution is the grouping/aggregation, material-level classification,
// portfolio summary, and the two independent rankings.

import {
	analyzeSupplierDependency,
	assembleMaterialReasonCodes,
	classifyMaterialRiskLevel,
	classifySupplyDependencyCondition,
	deriveSwitchingReadiness,
} from '../supplier-dependency-radar/analyze.ts';
import { DEFAULT_THRESHOLDS, type MaterialRiskLevel, type SupplierAggregateInput, type SupplierDependencyThresholds } from './types.ts';
import {
	RISK_BAND_ORDER,
	type MaterialDependencyResult,
	type SupplierDependencyAdvancedInput,
	type SupplierDependencyAdvancedResult,
	type SupplierDependencyPortfolioSummary,
	type SupplierDependencySummary,
	type SupplierMaterialRelationship,
} from './modes/advanced/types.ts';

function avgDefined(values: Array<number | undefined>): number | undefined {
	const defined = values.filter((v): v is number => v !== undefined);
	return defined.length > 0 ? defined.reduce((sum, v) => sum + v, 0) / defined.length : undefined;
}

function sumDefined(values: Array<number | undefined>): number | undefined {
	const defined = values.filter((v): v is number => v !== undefined);
	return defined.length > 0 ? defined.reduce((sum, v) => sum + v, 0) : undefined;
}

function maxDefined(values: Array<number | undefined>): number | undefined {
	const defined = values.filter((v): v is number => v !== undefined);
	return defined.length > 0 ? Math.max(...defined) : undefined;
}

/** false is the most cautious signal (no alternative/no qualified alternative) — it wins over unknown, which wins over true. */
function aggregateAvailability(values: Array<boolean | undefined>): boolean | undefined {
	if (values.some((v) => v === false)) return false;
	if (values.some((v) => v === undefined)) return undefined;
	return values.length > 0 ? true : undefined;
}

/** true is the most cautious signal (a requirement applies somewhere) — it wins over unknown, which wins over false. */
function aggregateRequirement(values: Array<boolean | undefined>): boolean | undefined {
	if (values.some((v) => v === true)) return true;
	if (values.some((v) => v === undefined)) return undefined;
	return values.length > 0 ? false : undefined;
}

function toAggregateInput(supplierName: string, rows: SupplierMaterialRelationship[]): SupplierAggregateInput {
	const singleSourceRows = rows.filter((row) => row.singleSource !== false);
	const qualifiedSingleSourceRows = rows.filter((row) => {
		const condition = classifySupplyDependencyCondition({
			singleSource: row.singleSource,
			qualifiedAlternativeAvailable: row.qualifiedAlternativeAvailable,
			criticalMaterial: row.criticalMaterial,
			qualificationLeadTimeMonths: row.qualificationLeadTimeMonths,
		});
		return condition === 'qualified-single-source' || condition === 'critical-single-source';
	});

	return {
		supplierName,
		materialCount: rows.length,
		criticalMaterialCount: rows.filter((row) => row.criticalMaterial === true).length,
		supplierSharePercent: avgDefined(rows.map((row) => row.supplierSharePercent)) ?? 0,
		singleSourceMaterialCount: singleSourceRows.length,
		qualifiedSingleSourceMaterialCount: qualifiedSingleSourceRows.length,
		alternativeSupplierAvailable: aggregateAvailability(rows.map((row) => row.alternativeSupplierAvailable)),
		qualifiedAlternativeAvailable: aggregateAvailability(rows.map((row) => row.qualifiedAlternativeAvailable)),
		qualificationRequired: aggregateRequirement(rows.map((row) => row.qualificationRequired)),
		qualificationLeadTimeMonths: maxDefined(rows.map((row) => row.qualificationLeadTimeMonths)),
		customerApprovalRequired: aggregateRequirement(rows.map((row) => row.customerApprovalRequired)),
		trialProductionRequired: aggregateRequirement(rows.map((row) => row.trialProductionRequired)),
		averageLeadTimeDays: avgDefined(rows.map((row) => row.leadTimeDays)),
		averageDelayDays: avgDefined(rows.map((row) => row.averageDelayDays)),
		deliveryReliabilityPercent: avgDefined(rows.map((row) => row.deliveryReliabilityPercent)),
		agreementCancellationCount: sumDefined(rows.map((row) => row.agreementCancellationCount)),
		annualExposureValue: sumDefined(rows.map((row) => row.annualExposureValue)),
		estimatedSwitchingTimeOverride: undefined,
	};
}

function classifyMaterialRow(row: SupplierMaterialRelationship, thresholds: SupplierDependencyThresholds): MaterialDependencyResult {
	const condition = classifySupplyDependencyCondition(
		{
			singleSource: row.singleSource,
			qualifiedAlternativeAvailable: row.qualifiedAlternativeAvailable,
			criticalMaterial: row.criticalMaterial,
			qualificationLeadTimeMonths: row.qualificationLeadTimeMonths,
		},
		thresholds
	);
	// Confidently multi-source (singleSource === false) has nothing to switch
	// away from — immediate. Unknown singleSource still derives normally
	// (uncertainty widens caution rather than defaulting to immediate).
	const switching =
		row.singleSource === false
			? 'immediate'
			: deriveSwitchingReadiness(row.qualifiedAlternativeAvailable, row.qualificationLeadTimeMonths, row.customerApprovalRequired, row.trialProductionRequired, thresholds);
	return {
		supplierName: row.supplierName,
		materialName: row.materialName,
		materialCategory: row.materialCategory,
		supplierSharePercent: row.supplierSharePercent,
		criticalMaterial: row.criticalMaterial,
		singleSource: row.singleSource,
		supplyDependencyCondition: condition,
		qualifiedAlternativeAvailable: row.qualifiedAlternativeAvailable,
		qualificationLeadTimeMonths: row.qualificationLeadTimeMonths,
		customerApprovalRequired: row.customerApprovalRequired,
		riskLevel: classifyMaterialRiskLevel(condition, row.criticalMaterial),
		reasonCodes: assembleMaterialReasonCodes(row, switching, thresholds),
		annualExposureValue: row.annualExposureValue,
	};
}

const MATERIAL_RISK_ORDER: Record<MaterialRiskLevel, number> = { critical: 0, high: 1, moderate: 2, low: 3 };

export function computeSupplierDependencyPortfolio(
	input: SupplierDependencyAdvancedInput,
	thresholds: SupplierDependencyThresholds = DEFAULT_THRESHOLDS
): SupplierDependencyAdvancedResult {
	const materials = input.relationships.map((row) => classifyMaterialRow(row, thresholds));

	const bySupplier = new Map<string, SupplierMaterialRelationship[]>();
	for (const row of input.relationships) {
		const rows = bySupplier.get(row.supplierName) ?? [];
		rows.push(row);
		bySupplier.set(row.supplierName, rows);
	}

	const suppliers: SupplierDependencySummary[] = Array.from(bySupplier.entries()).map(([supplierName, rows]) => {
		const aggregate = toAggregateInput(supplierName, rows);
		const output = analyzeSupplierDependency(aggregate, thresholds);
		return {
			...output,
			supplierName,
			materialCount: aggregate.materialCount,
			criticalMaterialCount: aggregate.criticalMaterialCount,
			singleSourceCount: aggregate.singleSourceMaterialCount,
			qualifiedSingleSourceCount: aggregate.qualifiedSingleSourceMaterialCount,
			averageSupplierSharePercent: aggregate.supplierSharePercent,
			averageLeadTimeDays: aggregate.averageLeadTimeDays,
			averageDelayDays: aggregate.averageDelayDays,
			deliveryReliabilityPercent: aggregate.deliveryReliabilityPercent,
			estimatedExposure: aggregate.annualExposureValue,
		};
	});

	const supplierRanking = [...suppliers]
		.sort((a, b) => RISK_BAND_ORDER[a.overallRisk] - RISK_BAND_ORDER[b.overallRisk] || b.dependencyScore - a.dependencyScore)
		.map((supplier) => supplier.supplierName);

	const materialRanking = [...materials]
		.sort(
			(a, b) =>
				MATERIAL_RISK_ORDER[a.riskLevel] - MATERIAL_RISK_ORDER[b.riskLevel] ||
				(b.annualExposureValue ?? 0) - (a.annualExposureValue ?? 0)
		)
		.map((material) => `${material.supplierName} · ${material.materialName}`);

	const estimatedExposureByRiskBand: Record<MaterialRiskLevel, number> = { low: 0, moderate: 0, high: 0, critical: 0 };
	let relationshipsWithoutExposureData = 0;
	for (const material of materials) {
		if (material.annualExposureValue !== undefined) estimatedExposureByRiskBand[material.riskLevel] += material.annualExposureValue;
		else relationshipsWithoutExposureData += 1;
	}

	const portfolio: SupplierDependencyPortfolioSummary = {
		totalSuppliers: suppliers.length,
		totalRelationships: materials.length,
		totalCriticalMaterials: materials.filter((material) => material.criticalMaterial === true).length,
		singleSourceMaterials: materials.filter((material) => material.supplyDependencyCondition !== 'multi-source').length,
		qualifiedSingleSourceMaterials: materials.filter(
			(material) => material.supplyDependencyCondition === 'qualified-single-source' || material.supplyDependencyCondition === 'critical-single-source'
		).length,
		materialsWithoutQualifiedAlternative: materials.filter((material) => material.qualifiedAlternativeAvailable === false).length,
		materialsRequiringCustomerApproval: materials.filter((material) => material.customerApprovalRequired === true).length,
		longQualificationTimeMaterials: materials.filter(
			(material) => material.qualificationLeadTimeMonths !== undefined && material.qualificationLeadTimeMonths >= thresholds.longQualificationMonths
		).length,
		topDependencySuppliers: supplierRanking.slice(0, 5),
		topCriticalMaterials: materialRanking.slice(0, 5),
		estimatedExposureByRiskBand,
		relationshipsWithoutExposureData,
	};

	return { suppliers, materials, portfolio, supplierRanking, materialRanking };
}
