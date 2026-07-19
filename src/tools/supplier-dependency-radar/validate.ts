// Structural guard for the Tool Contract (Quick Check path). Field-level
// rules (required, min/max, allowedValues — including the tri-state
// true/false/blank convention for boolean-ish fields) already run in the
// Quick intake schema (modes/quick/schema.ts) before this executes; this is
// the same defensive re-check every prior instrument's validate.ts performs.

import type { ValidationMessage } from '../../platform/message-codes.ts';
import type { ValidationResult } from '../../platform/tool-contract.ts';
import type { SupplierDependencyQuickRawInput, SupplierDependencyQuickValidatedInput, SwitchingReadiness } from './types.ts';

function toFiniteNumber(value: string): number | null {
	const trimmed = value.trim();
	if (trimmed === '') return null;
	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : null;
}

function parseRequiredNonNegative(value: string, field: string, errors: ValidationMessage[]): number | undefined {
	const parsed = toFiniteNumber(value);
	if (parsed === null) {
		errors.push({ code: 'VALIDATE_NUMBER_REQUIRED', params: { field }, message: `${field} must be a valid number.` });
		return undefined;
	}
	if (parsed < 0) {
		errors.push({ code: 'VALIDATE_NUMBER_NON_NEGATIVE', params: { field }, message: `${field} must not be negative.` });
		return undefined;
	}
	return parsed;
}

function parseRequiredPercent(value: string, field: string, errors: ValidationMessage[]): number | undefined {
	const parsed = parseRequiredNonNegative(value, field, errors);
	if (parsed === undefined) return undefined;
	if (parsed > 100) {
		errors.push({ code: 'NUMBER_TOO_HIGH', params: { field, max: 100 }, message: `${field} must be at most 100.` });
		return undefined;
	}
	return parsed;
}

function parseOptionalNonNegative(value: string, field: string, errors: ValidationMessage[]): number | undefined {
	if (value.trim() === '') return undefined;
	return parseRequiredNonNegative(value, field, errors);
}

function parseOptionalPercent(value: string, field: string, errors: ValidationMessage[]): number | undefined {
	if (value.trim() === '') return undefined;
	return parseRequiredPercent(value, field, errors);
}

function parseTriState(value: string, field: string, errors: ValidationMessage[]): boolean | undefined {
	const trimmed = value.trim().toLowerCase();
	if (trimmed === '') return undefined;
	if (trimmed === 'true') return true;
	if (trimmed === 'false') return false;
	errors.push({ code: 'NOT_ALLOWED_VALUE', params: { field, values: 'true, false' }, message: `${field} must be true, false, or blank.` });
	return undefined;
}

const SWITCHING_VALUES: readonly SwitchingReadiness[] = ['immediate', 'within-1-month', 'within-3-months', 'six-plus-months', 'unknown'];

function parseSwitchingOverride(value: string, field: string, errors: ValidationMessage[]): SwitchingReadiness | undefined {
	const trimmed = value.trim();
	if (trimmed === '') return undefined;
	if ((SWITCHING_VALUES as readonly string[]).includes(trimmed)) return trimmed as SwitchingReadiness;
	errors.push({ code: 'NOT_ALLOWED_VALUE', params: { field, values: SWITCHING_VALUES.join(', ') }, message: `${field} must be one of: ${SWITCHING_VALUES.join(', ')}.` });
	return undefined;
}

export function validateSupplierDependencyQuickInput(
	input: SupplierDependencyQuickRawInput
): ValidationResult<SupplierDependencyQuickValidatedInput> {
	const errors: ValidationMessage[] = [];

	const supplierName = input.supplierName.trim();
	if (supplierName === '') {
		errors.push({ code: 'REQUIRED_FIELD', params: { field: 'supplierName' }, message: 'supplierName is required.' });
	}

	const materialCount = parseRequiredNonNegative(input.materialCount, 'materialCount', errors);
	const criticalMaterialCount = parseRequiredNonNegative(input.criticalMaterialCount, 'criticalMaterialCount', errors);
	const supplierSharePercent = parseRequiredPercent(input.supplierSharePercent, 'supplierSharePercent', errors);
	const singleSourceMaterialCount = parseRequiredNonNegative(input.singleSourceMaterialCount, 'singleSourceMaterialCount', errors);
	const qualifiedSingleSourceMaterialCount = parseRequiredNonNegative(
		input.qualifiedSingleSourceMaterialCount,
		'qualifiedSingleSourceMaterialCount',
		errors
	);

	const alternativeSupplierAvailable = parseTriState(input.alternativeSupplierAvailable, 'alternativeSupplierAvailable', errors);
	const qualifiedAlternativeAvailable = parseTriState(input.qualifiedAlternativeAvailable, 'qualifiedAlternativeAvailable', errors);
	const qualificationRequired = parseTriState(input.qualificationRequired, 'qualificationRequired', errors);
	const customerApprovalRequired = parseTriState(input.customerApprovalRequired, 'customerApprovalRequired', errors);
	const trialProductionRequired = parseTriState(input.trialProductionRequired, 'trialProductionRequired', errors);

	const qualificationLeadTimeMonths = parseOptionalNonNegative(input.qualificationLeadTimeMonths, 'qualificationLeadTimeMonths', errors);
	const averageLeadTimeDays = parseOptionalNonNegative(input.averageLeadTimeDays, 'averageLeadTimeDays', errors);
	const averageDelayDays = parseOptionalNonNegative(input.averageDelayDays, 'averageDelayDays', errors);
	const deliveryReliabilityPercent = parseOptionalPercent(input.deliveryReliabilityPercent, 'deliveryReliabilityPercent', errors);
	const agreementCancellationCount = parseOptionalNonNegative(input.agreementCancellationCount, 'agreementCancellationCount', errors);
	const annualExposureValue = parseOptionalNonNegative(input.annualExposureValue, 'annualExposureValue', errors);
	const estimatedSwitchingTimeOverride = parseSwitchingOverride(input.estimatedSwitchingTime, 'estimatedSwitchingTime', errors);

	if (errors.length > 0) {
		return { valid: false, errors };
	}

	return {
		valid: true,
		data: {
			supplierName,
			materialCount: materialCount!,
			criticalMaterialCount: criticalMaterialCount!,
			supplierSharePercent: supplierSharePercent!,
			singleSourceMaterialCount: singleSourceMaterialCount!,
			qualifiedSingleSourceMaterialCount: qualifiedSingleSourceMaterialCount!,
			alternativeSupplierAvailable,
			qualifiedAlternativeAvailable,
			qualificationRequired,
			qualificationLeadTimeMonths,
			customerApprovalRequired,
			trialProductionRequired,
			averageLeadTimeDays,
			averageDelayDays,
			deliveryReliabilityPercent,
			agreementCancellationCount,
			annualExposureValue,
			estimatedSwitchingTimeOverride,
		},
	};
}
