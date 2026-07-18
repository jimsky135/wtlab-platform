// Structural guard for the Tool Contract. Field-level rules live in the
// mode intake schemas; this verifies the assembled engine input.

import type { ValidationMessage } from '../../platform/message-codes.ts';
import type { ValidationResult } from '../../platform/tool-contract.ts';
import type { DeadStockAnalysisInput } from './types.ts';

export function validateDeadStockInput(input: DeadStockAnalysisInput): ValidationResult<DeadStockAnalysisInput> {
	const errors: ValidationMessage[] = [];

	if (input.items.length === 0) {
		errors.push({ code: 'VALIDATE_AT_LEAST_ONE_ITEM', message: 'At least one item is required.' });
	}
	input.items.forEach((item, index) => {
		if (item.item.trim() === '') {
			errors.push({
				code: 'VALIDATE_MISSING_ITEM_ID',
				params: { index: index + 1 },
				message: `Item ${index + 1}: missing item identifier.`,
			});
		}
		if (!Number.isFinite(item.currentStock) || item.currentStock < 0) {
			errors.push({
				code: 'VALIDATE_STOCK_NON_NEGATIVE',
				params: { index: index + 1 },
				message: `Item ${index + 1}: current stock must be a non-negative number.`,
			});
		}
		if (!Number.isFinite(item.recentMonthlyConsumption) || item.recentMonthlyConsumption < 0) {
			errors.push({
				code: 'VALIDATE_CONSUMPTION_NON_NEGATIVE',
				params: { index: index + 1 },
				message: `Item ${index + 1}: recent monthly consumption must be a non-negative number.`,
			});
		}
	});
	for (const [name, value] of Object.entries(input.thresholds)) {
		if (!Number.isFinite(value) || value <= 0) {
			errors.push({
				code: 'VALIDATE_THRESHOLD_POSITIVE',
				params: { name },
				message: `Threshold ${name} must be a positive number.`,
			});
		}
	}

	return errors.length > 0 ? { valid: false, errors } : { valid: true, data: input };
}
