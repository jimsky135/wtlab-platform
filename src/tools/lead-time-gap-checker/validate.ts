// Structural guard for the Tool Contract. Field-level rules (ISO date
// format, non-negative numbers) also live in the mode intake schema; this
// independently re-validates the assembled raw input per Tool Contract
// convention (see arrival-collision-detector/validate.ts, dead-stock-scanner/validate.ts).
// Reuses the platform's existing generic number-validation codes rather
// than inventing near-duplicates (Sprint 007 Instrument Factory goal).

import type { ValidationMessage } from '../../platform/message-codes.ts';
import type { ValidationResult } from '../../platform/tool-contract.ts';
import type { LeadTimeGapRawInput, LeadTimeGapValidatedInput, TimeUnit } from './types.ts';

const DAYS_PER_MONTH = 30;
const ISO_DATE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

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

function toMonths(value: number, unit: TimeUnit): number {
	return unit === 'day' ? value / DAYS_PER_MONTH : value;
}

/**
 * Validates and normalizes raw form input. `monthlyConsumption` of 0 is
 * accepted (not required to be positive, unlike Water Level) — a
 * non-consuming item simply never depletes, which is this instrument's
 * own `safe` case, not an invalid input.
 */
export function validateLeadTimeGapInput(input: LeadTimeGapRawInput): ValidationResult<LeadTimeGapValidatedInput> {
	const errors: ValidationMessage[] = [];

	const currentStock = parseNonNegative(input.currentStock, 'currentStock', errors);
	const monthlyConsumption = parseNonNegative(input.monthlyConsumption, 'monthlyConsumption', errors);
	const leadTime = parseNonNegative(input.leadTime, 'leadTime', errors);
	const safetyBuffer = parseNonNegative(input.safetyBuffer, 'safetyBuffer', errors);

	const currentDateRaw = input.currentDate.trim();
	if (currentDateRaw !== '' && !ISO_DATE.test(currentDateRaw)) {
		errors.push({
			code: 'LEAD_TIME_CURRENT_DATE_INVALID_ISO',
			params: { field: 'currentDate', value: currentDateRaw },
			message: `"currentDate" must be an ISO date (YYYY-MM-DD), got "${currentDateRaw}".`,
		});
	}

	if (errors.length > 0) {
		return { valid: false, errors };
	}

	return {
		valid: true,
		data: {
			currentStock: currentStock!,
			monthlyConsumption: monthlyConsumption!,
			leadTimeMonths: toMonths(leadTime!, input.leadTimeUnit),
			safetyBufferMonths: toMonths(safetyBuffer!, input.safetyBufferUnit),
			currentDate: currentDateRaw === '' ? new Date().toISOString().slice(0, 10) : currentDateRaw,
		},
	};
}
