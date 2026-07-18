import type { ValidationMessage } from '../../platform/message-codes';
import type { ValidationResult } from '../../platform/tool-contract';
import type { InventoryBufferRawInput, InventoryBufferValidatedInput, TimeUnit } from './types';

const DAYS_PER_MONTH = 30;

function isProvided(value: string | undefined): boolean {
	return value !== undefined && value.trim() !== '';
}

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

function parsePositive(value: string, field: string, errors: ValidationMessage[]): number | undefined {
	const parsed = toFiniteNumber(value);
	if (parsed === null) {
		errors.push({ code: 'VALIDATE_NUMBER_REQUIRED', params: { field }, message: `${field} must be a valid number.` });
		return undefined;
	}
	if (parsed <= 0) {
		errors.push({ code: 'VALIDATE_NUMBER_POSITIVE', params: { field }, message: `${field} must be greater than 0.` });
		return undefined;
	}
	return parsed;
}

function toMonths(value: number, unit: TimeUnit): number {
	return unit === 'day' ? value / DAYS_PER_MONTH : value;
}

/**
 * Validates and normalizes raw form input per Tool Specification v0.2.
 * Collects every error rather than stopping at the first, so a caller
 * can surface all problems to the user at once.
 */
export function validateInventoryBufferInput(
	input: InventoryBufferRawInput
): ValidationResult<InventoryBufferValidatedInput> {
	const errors: ValidationMessage[] = [];

	const currentStock = parseNonNegative(input.currentStock, 'currentStock', errors);
	const monthlyConsumption = parsePositive(input.monthlyConsumption, 'monthlyConsumption', errors);
	const leadTime = parseNonNegative(input.leadTime, 'leadTime', errors);
	const safetyBuffer = parseNonNegative(input.safetyBuffer, 'safetyBuffer', errors);

	const inTransitProvided = isProvided(input.inTransitQuantity);
	const inTransitQuantity = inTransitProvided
		? parseNonNegative(input.inTransitQuantity as string, 'inTransitQuantity', errors)
		: undefined;

	const arrivalProvided = isProvided(input.arrivalTime);
	const arrivalTimeRaw = arrivalProvided
		? parseNonNegative(input.arrivalTime as string, 'arrivalTime', errors)
		: undefined;

	if (errors.length > 0) {
		return { valid: false, errors };
	}

	// Past this point every required field parsed successfully — the
	// non-null assertions below just restate what `errors.length === 0`
	// already guarantees.
	const leadTimeMonths = toMonths(leadTime!, input.leadTimeUnit);
	const safetyBufferMonths = toMonths(safetyBuffer!, input.safetyBufferUnit);
	const arrivalTimeMonths = arrivalProvided
		? toMonths(arrivalTimeRaw!, input.arrivalTimeUnit ?? 'month')
		: undefined;

	return {
		valid: true,
		data: {
			currentStock: currentStock!,
			monthlyConsumption: monthlyConsumption!,
			leadTimeMonths,
			safetyBufferMonths,
			inTransitQuantity,
			arrivalTimeMonths,
		},
	};
}
