// Structural guard for the Tool Contract — reuses the platform's generic
// number-validation codes (Instrument Factory reuse), same as every prior
// instrument's tool-level validate.ts.
//
// The one rule specific to this instrument: a blank window is DROPPED,
// not rejected and not zero-filled. Only a window the user actually filled
// in has to parse as a non-negative number. At least one window must
// survive, otherwise there is nothing to compare and nothing to defend
// against.

import type { ValidationMessage } from '../../platform/message-codes.ts';
import type { ValidationResult } from '../../platform/tool-contract.ts';
import {
	DEMAND_WINDOW_IDS,
	type DemandWaveRawInput,
	type DemandWaveValidatedInput,
	type DemandWindowAverage,
} from './types.ts';

function toFiniteNumber(value: string): number | null {
	const trimmed = value.trim();
	if (trimmed === '') return null;
	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : null;
}

export function validateDemandWaveInput(input: DemandWaveRawInput): ValidationResult<DemandWaveValidatedInput> {
	const errors: ValidationMessage[] = [];
	const windows: DemandWindowAverage[] = [];

	for (const window of DEMAND_WINDOW_IDS) {
		const raw = input[window] ?? '';
		if (raw.trim() === '') continue; // no data for this window — not an error.

		const parsed = toFiniteNumber(raw);
		if (parsed === null) {
			errors.push({
				code: 'VALIDATE_NUMBER_REQUIRED',
				params: { field: window },
				message: `${window} must be a valid number.`,
			});
			continue;
		}
		if (parsed < 0) {
			errors.push({
				code: 'VALIDATE_NUMBER_NON_NEGATIVE',
				params: { field: window },
				message: `${window} must not be negative.`,
			});
			continue;
		}
		windows.push({ window, monthlyAverage: parsed });
	}

	if (errors.length === 0 && windows.length === 0) {
		errors.push({
			code: 'VALIDATE_AT_LEAST_ONE_DEMAND_WINDOW',
			message: 'At least one monthly average must be provided.',
		});
	}

	if (errors.length > 0) {
		return { valid: false, errors };
	}

	return { valid: true, data: { windows } };
}
