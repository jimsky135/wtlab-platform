// Structural guard for the Tool Contract. Field-level rules (ISO date
// format, non-negative numbers) already live in the mode intake schemas;
// this only verifies the assembled engine input is structurally sound.

import type { ValidationMessage } from '../../platform/message-codes.ts';
import type { ValidationResult } from '../../platform/tool-contract.ts';
import type { ArrivalAnalysisInput } from './types.ts';

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

export function validateArrivalInput(input: ArrivalAnalysisInput): ValidationResult<ArrivalAnalysisInput> {
	const errors: ValidationMessage[] = [];

	if (input.arrivals.length === 0) {
		errors.push({ code: 'VALIDATE_AT_LEAST_ONE_ARRIVAL', message: 'At least one arrival is required.' });
	}
	input.arrivals.forEach((arrival, index) => {
		if (!MONTH_KEY.test(arrival.monthKey)) {
			errors.push({
				code: 'VALIDATE_INVALID_MONTH_KEY',
				params: { index: index + 1, value: arrival.monthKey },
				message: `Arrival ${index + 1}: month key "${arrival.monthKey}" is not a valid YYYY-MM value.`,
			});
		}
		if (!Number.isFinite(arrival.quantity) || arrival.quantity < 0) {
			errors.push({
				code: 'VALIDATE_QUANTITY_NON_NEGATIVE',
				params: { index: index + 1 },
				message: `Arrival ${index + 1}: quantity must be a non-negative number.`,
			});
		}
	});
	if (input.monthlyCapacity !== undefined && (!Number.isFinite(input.monthlyCapacity) || input.monthlyCapacity < 0)) {
		errors.push({ code: 'VALIDATE_CAPACITY_NON_NEGATIVE', message: 'Monthly capacity must be a non-negative number.' });
	}

	return errors.length > 0 ? { valid: false, errors } : { valid: true, data: input };
}
