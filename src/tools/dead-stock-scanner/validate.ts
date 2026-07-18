// Structural guard for the Tool Contract. Field-level rules live in the
// mode intake schemas; this verifies the assembled engine input.

import type { ValidationResult } from '../../platform/tool-contract.ts';
import type { DeadStockAnalysisInput } from './types.ts';

export function validateDeadStockInput(input: DeadStockAnalysisInput): ValidationResult<DeadStockAnalysisInput> {
	const errors: string[] = [];

	if (input.items.length === 0) {
		errors.push('At least one item is required.');
	}
	input.items.forEach((item, index) => {
		if (item.item.trim() === '') errors.push(`Item ${index + 1}: missing item identifier.`);
		if (!Number.isFinite(item.currentStock) || item.currentStock < 0) {
			errors.push(`Item ${index + 1}: current stock must be a non-negative number.`);
		}
		if (!Number.isFinite(item.recentMonthlyConsumption) || item.recentMonthlyConsumption < 0) {
			errors.push(`Item ${index + 1}: recent monthly consumption must be a non-negative number.`);
		}
	});
	for (const [name, value] of Object.entries(input.thresholds)) {
		if (!Number.isFinite(value) || value <= 0) errors.push(`Threshold ${name} must be a positive number.`);
	}

	return errors.length > 0 ? { valid: false, errors } : { valid: true, data: input };
}
