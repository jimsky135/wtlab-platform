// Advanced adapter: confirmed one-row-per-supplier-material-relationship
// records → the instrument's typed SupplierMaterialRelationship[]. Pure
// structure/type conversion — including the tri-state boolean parse
// (undefined stays undefined/unknown, never defaulted to false). No
// dependency classification here; that lives in portfolio.ts.

import type { SupplierMaterialRelationship } from '../../../tools/supplier-dependency-radar/modes/advanced/types.ts';
import type { SupplierDependencyAdvancedInput } from '../../../tools/supplier-dependency-radar/modes/advanced/types.ts';
import type { ConfirmedIntake } from '../../intake/types.ts';
import type { AdapterOutcome } from '../types.ts';

function asOptionalNumber(value: string | number | undefined): number | undefined {
	return typeof value === 'number' ? value : undefined;
}

function asOptionalString(value: string | number | undefined): string | undefined {
	return typeof value === 'string' && value !== '' ? value : undefined;
}

function asOptionalBoolean(value: string | number | undefined): boolean | undefined {
	if (value === 'true') return true;
	if (value === 'false') return false;
	return undefined;
}

export function toSupplierMaterialRelationships(records: ConfirmedIntake['records']): SupplierMaterialRelationship[] {
	return records.map((record) => ({
		supplierName: typeof record['supplierName'] === 'string' ? record['supplierName'] : String(record['supplierName'] ?? ''),
		materialName: typeof record['materialName'] === 'string' ? record['materialName'] : String(record['materialName'] ?? ''),
		materialCategory: asOptionalString(record['materialCategory']),
		supplierSharePercent: asOptionalNumber(record['supplierSharePercent']),
		criticalMaterial: asOptionalBoolean(record['criticalMaterial']),
		singleSource: asOptionalBoolean(record['singleSource']),
		alternativeSupplierAvailable: asOptionalBoolean(record['alternativeSupplierAvailable']),
		qualifiedAlternativeAvailable: asOptionalBoolean(record['qualifiedAlternativeAvailable']),
		qualificationRequired: asOptionalBoolean(record['qualificationRequired']),
		qualificationLeadTimeMonths: asOptionalNumber(record['qualificationLeadTimeMonths']),
		customerApprovalRequired: asOptionalBoolean(record['customerApprovalRequired']),
		trialProductionRequired: asOptionalBoolean(record['trialProductionRequired']),
		leadTimeDays: asOptionalNumber(record['leadTimeDays']),
		averageDelayDays: asOptionalNumber(record['averageDelayDays']),
		deliveryReliabilityPercent: asOptionalNumber(record['deliveryReliabilityPercent']),
		agreementCancellationCount: asOptionalNumber(record['agreementCancellationCount']),
		annualUsage: asOptionalNumber(record['annualUsage']),
		annualExposureValue: asOptionalNumber(record['annualExposureValue']),
		optionalNotes: asOptionalString(record['optionalNotes']),
	}));
}

export function supplierDependencyAdvancedAdapter(confirmed: ConfirmedIntake): AdapterOutcome<SupplierDependencyAdvancedInput> {
	if (confirmed.records.length === 0) {
		return { ok: false, issues: [{ severity: 'error', message: 'No confirmed rows to run.', code: 'NO_CONFIRMED_ROWS' }] };
	}
	return { ok: true, data: { relationships: toSupplierMaterialRelationships(confirmed.records) } };
}
