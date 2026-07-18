// Column mapping between CSV headers and intake schema fields.
// Suggestions are exact matches only (trimmed, case-insensitive against
// field id or label) — no fuzzy or AI-based matching. The user always
// reviews and can change the mapping. Unknown columns are preserved.

import type { CsvParseResult } from './csv.ts';
import type { IntakeIssue, IntakeSchema, RawIntakeRecord } from './types.ts';

/** Source CSV header → destination schema field id, or null = unmapped. */
export type ColumnMapping = Record<string, string | null>;

/** Suggest destinations for headers that exactly match a field id/label. */
export function suggestMapping(headers: readonly string[], schema: IntakeSchema): ColumnMapping {
	const mapping: ColumnMapping = {};
	for (const header of headers) {
		const needle = header.trim().toLowerCase();
		const match = schema.fields.find(
			(field) => field.id.toLowerCase() === needle || field.label.trim().toLowerCase() === needle
		);
		mapping[header] = match ? match.id : null;
	}
	return mapping;
}

/** Duplicate destinations and unmapped required fields are reported as errors. */
export function validateMapping(mapping: ColumnMapping, schema: IntakeSchema): IntakeIssue[] {
	const issues: IntakeIssue[] = [];

	const used = new Map<string, string[]>();
	for (const [source, destination] of Object.entries(mapping)) {
		if (destination === null) continue;
		used.set(destination, [...(used.get(destination) ?? []), source]);
	}

	for (const [destination, sources] of used) {
		if (sources.length > 1) {
			issues.push({
				severity: 'error',
				message: `Columns ${sources.map((s) => `"${s}"`).join(' and ')} are both mapped to "${destination}". Map only one.`,
				code: 'MAPPING_DUPLICATE_DESTINATION',
				params: { sources: sources.map((s) => `"${s}"`).join(' and ') },
				field: destination,
			});
		}
	}

	for (const field of schema.fields) {
		if (field.required && !used.has(field.id)) {
			issues.push({
				severity: 'error',
				message: `Required field "${field.label}" has no mapped column.`,
				code: 'MAPPING_REQUIRED_FIELD_UNMAPPED',
				field: field.id,
			});
		}
	}

	return issues;
}

/**
 * Applies a mapping to parsed CSV rows. Mapped columns become raw field
 * values; unmapped columns are preserved under `unknown`. Rows shorter
 * than the header count yield empty strings for the missing cells.
 */
export function applyMapping(parse: CsvParseResult, mapping: ColumnMapping): RawIntakeRecord[] {
	return parse.rows.map((row) => {
		const record: RawIntakeRecord = { values: {}, unknown: {} };
		parse.headers.forEach((header, index) => {
			const cell = row[index] ?? '';
			const destination = mapping[header] ?? null;
			if (destination === null) {
				record.unknown[header] = cell;
			} else {
				record.values[destination] = cell;
			}
		});
		return record;
	});
}
