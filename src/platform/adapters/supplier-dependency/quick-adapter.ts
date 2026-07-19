// Quick adapter: confirmed quick-mode intake rows → the instrument's
// existing raw input shape. The instrument's own validate stays
// authoritative — this adapter emits RAW string input (including blank for
// unknown tri-state fields), it never pre-validates business rules.

import type { SupplierDependencyQuickRawInput } from '../../../tools/supplier-dependency-radar/types.ts';
import type { ConfirmedIntake } from '../../intake/types.ts';
import type { AdapterOutcome, SupplierDependencyQuickAdapterItem } from './types.ts';

function asString(value: string | number | undefined): string {
	return value === undefined ? '' : String(value);
}

export function supplierDependencyQuickAdapter(confirmed: ConfirmedIntake): AdapterOutcome<SupplierDependencyQuickAdapterItem[]> {
	if (confirmed.records.length === 0) {
		return { ok: false, issues: [{ severity: 'error', message: 'No confirmed rows to run.', code: 'NO_CONFIRMED_ROWS' }] };
	}

	const items: SupplierDependencyQuickAdapterItem[] = confirmed.records.map((record) => {
		const input: SupplierDependencyQuickRawInput = {
			supplierName: asString(record['supplierName']),
			materialCount: asString(record['materialCount']),
			criticalMaterialCount: asString(record['criticalMaterialCount']),
			supplierSharePercent: asString(record['supplierSharePercent']),
			singleSourceMaterialCount: asString(record['singleSourceMaterialCount']),
			qualifiedSingleSourceMaterialCount: asString(record['qualifiedSingleSourceMaterialCount']),
			alternativeSupplierAvailable: asString(record['alternativeSupplierAvailable']),
			qualifiedAlternativeAvailable: asString(record['qualifiedAlternativeAvailable']),
			qualificationRequired: asString(record['qualificationRequired']),
			qualificationLeadTimeMonths: asString(record['qualificationLeadTimeMonths']),
			customerApprovalRequired: asString(record['customerApprovalRequired']),
			trialProductionRequired: asString(record['trialProductionRequired']),
			averageLeadTimeDays: asString(record['averageLeadTimeDays']),
			averageDelayDays: asString(record['averageDelayDays']),
			deliveryReliabilityPercent: asString(record['deliveryReliabilityPercent']),
			agreementCancellationCount: asString(record['agreementCancellationCount']),
			annualExposureValue: asString(record['annualExposureValue']),
			estimatedSwitchingTime: asString(record['estimatedSwitchingTime']),
			notes: asString(record['notes']),
		};
		return { supplierName: input.supplierName || 'supplier', input };
	});

	return { ok: true, data: items };
}
