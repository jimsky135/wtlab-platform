// Export serialization for Supplier Dependency Radar results. Pure
// functions, unit-tested separately from the UI. Result-only headers: the
// identifying columns are deliberately named 'supplier'/'material', not
// 'supplierName'/'materialName' (the input schemas' required field ids) —
// same convention as Buffer Drift Monitor renaming itemName→item,
// period→periodNumber — so suggestMapping's exact-match never resolves
// them and both required fields stay unmapped, blocking accidental
// re-import as an input file.

import { buildCsv } from '../../platform/templates/generate-csv-template.ts';
import type { SupplierDependencyAdvancedResult } from './modes/advanced/types.ts';
import type { SupplierAggregateInput, SupplierDependencyOutput } from './types.ts';

const NOT_APPLICABLE = 'n/a';

function boolCell(value: boolean | undefined): string {
	return value === undefined ? 'unknown' : String(value);
}

const RESULT_HEADER = [
	'supplier',
	'material',
	'overallRisk',
	'supplierDependencyLevel',
	'qualificationDependencyLevel',
	'switchingReadiness',
	'supplierSharePercent',
	'criticalMaterial',
	'singleSource',
	'qualifiedAlternativeAvailable',
	'qualificationLeadTimeMonths',
	'customerApprovalRequired',
	'reasonCodes',
	'recommendedActionCodes',
	'estimatedExposure',
];

/** Quick-mode result CSV: one row, the supplier's own aggregate assessment. */
export function supplierDependencyQuickResultToCsv(input: SupplierAggregateInput, output: SupplierDependencyOutput): string {
	const row = [
		input.supplierName,
		'',
		output.overallRisk,
		output.supplierDependencyLevel,
		output.qualificationDependencyLevel,
		output.switchingReadiness,
		String(input.supplierSharePercent),
		NOT_APPLICABLE,
		String(input.singleSourceMaterialCount > 0),
		boolCell(input.qualifiedAlternativeAvailable),
		input.qualificationLeadTimeMonths === undefined ? NOT_APPLICABLE : String(input.qualificationLeadTimeMonths),
		boolCell(input.customerApprovalRequired),
		output.reasonCodes.join('|'),
		output.recommendedActionCodes.join('|'),
		input.annualExposureValue === undefined ? 'unknown' : String(input.annualExposureValue),
	];
	return buildCsv([RESULT_HEADER, row]);
}

/** Advanced-mode result CSV: one row per supplier-material relationship, annotated with its supplier's dependency levels. */
export function supplierDependencyAdvancedResultToCsv(result: SupplierDependencyAdvancedResult): string {
	const supplierById = new Map(result.suppliers.map((supplier) => [supplier.supplierName, supplier]));
	const rows = result.materials.map((material) => {
		const supplier = supplierById.get(material.supplierName);
		return [
			material.supplierName,
			material.materialName,
			supplier?.overallRisk ?? NOT_APPLICABLE,
			supplier?.supplierDependencyLevel ?? NOT_APPLICABLE,
			supplier?.qualificationDependencyLevel ?? NOT_APPLICABLE,
			supplier?.switchingReadiness ?? NOT_APPLICABLE,
			material.supplierSharePercent === undefined ? NOT_APPLICABLE : String(material.supplierSharePercent),
			boolCell(material.criticalMaterial),
			boolCell(material.singleSource),
			boolCell(material.qualifiedAlternativeAvailable),
			material.qualificationLeadTimeMonths === undefined ? NOT_APPLICABLE : String(material.qualificationLeadTimeMonths),
			boolCell(material.customerApprovalRequired),
			material.reasonCodes.join('|'),
			supplier?.recommendedActionCodes.join('|') ?? '',
			material.annualExposureValue === undefined ? 'unknown' : String(material.annualExposureValue),
		];
	});
	return buildCsv([RESULT_HEADER, ...rows]);
}
