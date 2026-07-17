// Schema-driven validation over normalized records. Deterministic:
// same input, same schema → same issues in the same order.

import { normalizeRecord } from './normalize.ts';
import type { IntakeIssue, IntakeSchema, IntakeValidationResult, NormalizedIntakeRecord, RawIntakeRecord } from './types.ts';

function validateRecord(record: NormalizedIntakeRecord, schema: IntakeSchema, row: number): IntakeIssue[] {
	const issues: IntakeIssue[] = [];

	for (const field of schema.fields) {
		const normalized = record.fields[field.id];

		// Carry normalization issues (info/error) into the row context.
		for (const issue of normalized.issues) {
			issues.push({ ...issue, row });
		}

		if (normalized.value === undefined) {
			if (field.required && !normalized.issues.some((issue) => issue.severity === 'error')) {
				issues.push({
					severity: 'error',
					message: `"${field.label}" is required.`,
					field: field.id,
					row,
				});
			}
			continue;
		}

		if (field.type === 'number' && typeof normalized.value === 'number') {
			if (field.min !== undefined && normalized.value < field.min) {
				issues.push({
					severity: 'error',
					message: `"${field.label}" must be at least ${field.min}.`,
					field: field.id,
					row,
				});
			}
			if (field.max !== undefined && normalized.value > field.max) {
				issues.push({
					severity: 'error',
					message: `"${field.label}" must be at most ${field.max}.`,
					field: field.id,
					row,
				});
			}
		}

		if (field.allowedValues !== undefined && typeof normalized.value === 'string') {
			if (!field.allowedValues.includes(normalized.value)) {
				issues.push({
					severity: 'error',
					message: `"${field.label}" must be one of: ${field.allowedValues.join(', ')}.`,
					field: field.id,
					row,
				});
			}
		}
	}

	if (schema.validateRecord) {
		for (const issue of schema.validateRecord(record)) {
			issues.push({ ...issue, row });
		}
	}

	return issues;
}

export function validateRecords(rawRecords: RawIntakeRecord[], schema: IntakeSchema): IntakeValidationResult {
	const records = rawRecords.map((raw) => normalizeRecord(raw, schema));
	const issues = records.flatMap((record, row) => validateRecord(record, schema, row));

	return {
		records,
		issues,
		errorCount: issues.filter((issue) => issue.severity === 'error').length,
		warningCount: issues.filter((issue) => issue.severity === 'warning').length,
		infoCount: issues.filter((issue) => issue.severity === 'info').length,
	};
}
