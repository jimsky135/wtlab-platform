// Supplier Dependency Radar — Advanced Scan intake schema. One row per
// supplier-material relationship (not per supplier) — the core modeling
// principle of this instrument (Supplier × Material, see docs/engineering.md
// Sprint 009 entry). Same tri-state boolean-as-text convention as Quick.

import type { IntakeIssue, IntakeSchema, NormalizedIntakeRecord } from '../../../../platform/intake/types.ts';

const TRI_STATE_VALUES = ['true', 'false'] as const;

export function supplierDependencyAdvancedWarnings(record: NormalizedIntakeRecord): IntakeIssue[] {
	const issues: IntakeIssue[] = [];
	if (record.fields['criticalMaterial']?.value === undefined) {
		issues.push({
			severity: 'warning',
			message: 'Critical material status unknown — cannot be ruled out as critical.',
			code: 'SUPPLIER_DEP_CRITICAL_STATUS_UNKNOWN_WARNING',
			field: 'criticalMaterial',
		});
	}
	if (
		record.fields['qualificationLeadTimeMonths']?.value === undefined &&
		record.fields['qualifiedAlternativeAvailable']?.value !== 'true'
	) {
		issues.push({
			severity: 'warning',
			message: 'Qualification lead time unknown — treated as an open risk, not zero.',
			code: 'SUPPLIER_DEP_QUALIFICATION_TIME_UNKNOWN_WARNING',
			field: 'qualificationLeadTimeMonths',
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
	if (record.fields['annualExposureValue']?.value === undefined) {
		issues.push({
			severity: 'warning',
			message: 'Annual exposure value missing — exposure cannot be estimated for this relationship.',
			code: 'SUPPLIER_DEP_EXPOSURE_VALUE_MISSING_WARNING',
			field: 'annualExposureValue',
		});
	}
	return issues;
}

export const supplierDependencyAdvancedSchema: IntakeSchema = {
	id: 'supplier-dependency-advanced',
	title: 'Supplier Dependency Advanced Scan',
	fields: [
		{ id: 'supplierName', label: 'Supplier Name', type: 'text', required: true },
		{ id: 'materialName', label: 'Material Name', type: 'text', required: true },
		{ id: 'materialCategory', label: 'Material Category', type: 'text', required: false },
		{ id: 'supplierSharePercent', label: 'Supplier Share (%)', type: 'number', required: false, min: 0, max: 100 },
		{ id: 'criticalMaterial', label: 'Critical Material', type: 'text', required: false, allowedValues: TRI_STATE_VALUES },
		{ id: 'singleSource', label: 'Single Source', type: 'text', required: false, allowedValues: TRI_STATE_VALUES },
		{
			id: 'alternativeSupplierAvailable',
			label: 'Alternative Supplier Available',
			type: 'text',
			required: false,
			allowedValues: TRI_STATE_VALUES,
		},
		{
			id: 'qualifiedAlternativeAvailable',
			label: 'Qualified Alternative Available',
			type: 'text',
			required: false,
			allowedValues: TRI_STATE_VALUES,
		},
		{ id: 'qualificationRequired', label: 'Qualification Required', type: 'text', required: false, allowedValues: TRI_STATE_VALUES },
		{ id: 'qualificationLeadTimeMonths', label: 'Qualification Lead Time (months)', type: 'number', required: false, min: 0 },
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
		{ id: 'leadTimeDays', label: 'Lead Time (days)', type: 'number', required: false, min: 0 },
		{ id: 'averageDelayDays', label: 'Average Delay Days', type: 'number', required: false, min: 0 },
		{ id: 'deliveryReliabilityPercent', label: 'Delivery Reliability (%)', type: 'number', required: false, min: 0, max: 100 },
		{ id: 'agreementCancellationCount', label: 'Agreement Cancellation Count', type: 'number', required: false, min: 0 },
		{ id: 'annualUsage', label: 'Annual Usage', type: 'number', required: false, min: 0 },
		{ id: 'annualExposureValue', label: 'Annual Exposure Value', type: 'number', required: false, min: 0 },
		{ id: 'optionalNotes', label: 'Notes', type: 'text', required: false },
	],
	validateRecord: supplierDependencyAdvancedWarnings,
};
