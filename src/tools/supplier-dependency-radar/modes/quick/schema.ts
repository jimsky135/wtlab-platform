// Supplier Dependency Radar — Quick Check intake schema. One row per
// supplier, aggregate counts across its materials. Boolean-ish fields use
// the platform's existing text + allowedValues['true','false'] convention
// (Sprint 009 architecture review: no new intake field type was needed) —
// blank means unknown, 'false' means confirmed no. Unknown is surfaced as a
// warning, never silently treated as safe.

import type { IntakeIssue, IntakeSchema, NormalizedIntakeRecord } from '../../../../platform/intake/types.ts';

const TRI_STATE_VALUES = ['true', 'false'] as const;
const SWITCHING_VALUES = ['immediate', 'within-1-month', 'within-3-months', 'six-plus-months'] as const;

export function supplierDependencyQuickWarnings(record: NormalizedIntakeRecord): IntakeIssue[] {
	const issues: IntakeIssue[] = [];
	if (record.fields['qualificationLeadTimeMonths']?.value === undefined) {
		issues.push({
			severity: 'warning',
			message: 'Qualification lead time unknown — treated as an open risk, not zero.',
			code: 'SUPPLIER_DEP_QUALIFICATION_TIME_UNKNOWN_WARNING',
			field: 'qualificationLeadTimeMonths',
		});
	}
	if (
		record.fields['estimatedSwitchingTime']?.value === undefined &&
		record.fields['qualifiedAlternativeAvailable']?.value !== 'true'
	) {
		issues.push({
			severity: 'warning',
			message: 'Switching time unknown — will be assessed as unknown, not immediate.',
			code: 'SUPPLIER_DEP_SWITCHING_TIME_UNKNOWN_WARNING',
			field: 'estimatedSwitchingTime',
		});
	}
	if (record.fields['annualExposureValue']?.value === undefined) {
		issues.push({
			severity: 'warning',
			message: 'Annual exposure value missing — exposure cannot be estimated.',
			code: 'SUPPLIER_DEP_EXPOSURE_VALUE_MISSING_WARNING',
			field: 'annualExposureValue',
		});
	}
	if (
		record.fields['alternativeSupplierAvailable']?.value === 'true' &&
		record.fields['qualifiedAlternativeAvailable']?.value === undefined
	) {
		issues.push({
			severity: 'warning',
			message: 'An alternative supplier exists but its qualification status is unknown.',
			code: 'SUPPLIER_DEP_ALT_EXISTS_QUALIFICATION_UNKNOWN_WARNING',
			field: 'qualifiedAlternativeAvailable',
		});
	}
	if (record.fields['customerApprovalRequired']?.value === undefined) {
		issues.push({
			severity: 'warning',
			message: 'Customer approval requirement unknown.',
			code: 'SUPPLIER_DEP_CUSTOMER_APPROVAL_UNKNOWN_WARNING',
			field: 'customerApprovalRequired',
		});
	}
	if (record.fields['deliveryReliabilityPercent']?.value === undefined) {
		issues.push({
			severity: 'warning',
			message: 'Delivery reliability missing.',
			code: 'SUPPLIER_DEP_DELIVERY_RELIABILITY_MISSING_WARNING',
			field: 'deliveryReliabilityPercent',
		});
	}
	if (record.fields['averageDelayDays']?.value === undefined || record.fields['agreementCancellationCount']?.value === undefined) {
		issues.push({
			severity: 'warning',
			message: 'Historical delay/cancellation data missing.',
			code: 'SUPPLIER_DEP_PERFORMANCE_HISTORY_MISSING_WARNING',
			field: 'averageDelayDays',
		});
	}
	return issues;
}

export const supplierDependencyQuickSchema: IntakeSchema = {
	id: 'supplier-dependency-quick',
	title: 'Supplier Dependency Quick Check',
	fields: [
		{ id: 'supplierName', label: 'Supplier Name', type: 'text', required: true },
		{ id: 'materialCount', label: 'Material Count Supplied', type: 'number', required: true, min: 0 },
		{ id: 'criticalMaterialCount', label: 'Critical Material Count', type: 'number', required: true, min: 0 },
		{ id: 'supplierSharePercent', label: 'Supplier Share (%)', type: 'number', required: true, min: 0, max: 100 },
		{ id: 'singleSourceMaterialCount', label: 'Single Source Material Count', type: 'number', required: true, min: 0 },
		{
			id: 'qualifiedSingleSourceMaterialCount',
			label: 'Qualified Single Source Material Count',
			type: 'number',
			required: true,
			min: 0,
		},
		{
			id: 'alternativeSupplierAvailable',
			label: 'Alternative Supplier Available',
			description: 'blank = unknown',
			type: 'text',
			required: false,
			allowedValues: TRI_STATE_VALUES,
		},
		{
			id: 'qualifiedAlternativeAvailable',
			label: 'Qualified Alternative Available',
			description: 'blank = unknown; false = confirmed no qualified alternative',
			type: 'text',
			required: false,
			allowedValues: TRI_STATE_VALUES,
		},
		{ id: 'qualificationRequired', label: 'Qualification Required', type: 'text', required: false, allowedValues: TRI_STATE_VALUES },
		{
			id: 'qualificationLeadTimeMonths',
			label: 'Qualification Lead Time (months)',
			description: 'blank = unknown',
			type: 'number',
			required: false,
			min: 0,
		},
		{
			id: 'customerApprovalRequired',
			label: 'Customer Approval Required',
			type: 'text',
			required: false,
			allowedValues: TRI_STATE_VALUES,
		},
		{
			id: 'trialProductionRequired',
			label: 'Trial Production Required',
			type: 'text',
			required: false,
			allowedValues: TRI_STATE_VALUES,
		},
		{ id: 'averageLeadTimeDays', label: 'Average Lead Time (days)', type: 'number', required: false, min: 0 },
		{ id: 'averageDelayDays', label: 'Average Delay Days', type: 'number', required: false, min: 0 },
		{ id: 'deliveryReliabilityPercent', label: 'Delivery Reliability (%)', type: 'number', required: false, min: 0, max: 100 },
		{ id: 'agreementCancellationCount', label: 'Agreement Cancellation Count', type: 'number', required: false, min: 0 },
		{ id: 'annualExposureValue', label: 'Annual Exposure Value', type: 'number', required: false, min: 0 },
		{
			id: 'estimatedSwitchingTime',
			label: 'Estimated Switching Time',
			description: 'blank = let the engine derive it from qualification status',
			type: 'text',
			required: false,
			allowedValues: SWITCHING_VALUES,
		},
		{ id: 'notes', label: 'Notes', type: 'text', required: false },
	],
	validateRecord: supplierDependencyQuickWarnings,
};
