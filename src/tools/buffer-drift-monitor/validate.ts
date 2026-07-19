// Structural guard for the Tool Contract — reuses the platform's generic
// number-validation codes (Sprint 008 Instrument Factory reuse), same as
// every prior instrument's tool-level validate.ts.

import type { ValidationMessage } from '../../platform/message-codes.ts';
import type { ValidationResult } from '../../platform/tool-contract.ts';
import type { BufferDriftRawInput, BufferDriftValidatedInput } from './types.ts';

function toFiniteNumber(value: string): number | null {
	const trimmed = value.trim();
	if (trimmed === '') return null;
	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : null;
}

function parseNonNegative(value: string, field: string, errors: ValidationMessage[]): number | undefined {
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

export function validateBufferDriftInput(input: BufferDriftRawInput): ValidationResult<BufferDriftValidatedInput> {
	const errors: ValidationMessage[] = [];

	const monthlyConsumption = parseNonNegative(input.monthlyConsumption, 'monthlyConsumption', errors);
	const intendedBufferMonths = parseNonNegative(input.intendedBufferMonths, 'intendedBufferMonths', errors);
	const actualBufferQuantity = parseNonNegative(input.actualBufferQuantity, 'actualBufferQuantity', errors);

	if (errors.length > 0) {
		return { valid: false, errors };
	}

	return {
		valid: true,
		data: {
			monthlyConsumption: monthlyConsumption!,
			intendedBufferMonths: intendedBufferMonths!,
			actualBufferQuantity: actualBufferQuantity!,
		},
	};
}
