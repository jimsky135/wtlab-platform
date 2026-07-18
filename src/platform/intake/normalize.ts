// Normalization: schema-driven, conservative, transparent. Only two
// transformations exist — whitespace trimming and explicit number
// parsing for fields declared numeric. Every change is recorded as an
// info issue; failed conversions are errors that keep the raw value.
// No unit guessing, no date inference, no silent repair.

import type { IntakeSchema, NormalizedFieldValue, NormalizedIntakeRecord, RawIntakeRecord } from './types.ts';

function normalizeField(raw: string, type: 'text' | 'number', fieldId: string): NormalizedFieldValue {
	const result: NormalizedFieldValue = { raw, value: undefined, changed: false, issues: [] };
	const trimmed = raw.trim();

	if (trimmed !== raw) {
		result.changed = true;
		result.issues.push({
			severity: 'info',
			message: 'Surrounding whitespace was removed.',
			code: 'WHITESPACE_TRIMMED',
			field: fieldId,
		});
	}

	if (trimmed === '') {
		// Blank means missing — value stays undefined; requiredness is
		// judged later by validation, not here.
		if (raw !== '') {
			result.issues.push({
				severity: 'info',
				message: 'Blank value treated as missing.',
				code: 'BLANK_TREATED_AS_MISSING',
				field: fieldId,
			});
		}
		return result;
	}

	if (type === 'number') {
		const parsed = Number(trimmed);
		if (!Number.isFinite(parsed)) {
			result.issues.push({
				severity: 'error',
				message: `"${raw}" is not a valid number.`,
				code: 'INVALID_NUMBER',
				params: { value: raw },
				field: fieldId,
			});
			return result;
		}
		result.value = parsed;
		return result;
	}

	result.value = trimmed;
	return result;
}

export function normalizeRecord(raw: RawIntakeRecord, schema: IntakeSchema): NormalizedIntakeRecord {
	const fields: Record<string, NormalizedFieldValue> = {};
	for (const field of schema.fields) {
		fields[field.id] = normalizeField(raw.values[field.id] ?? '', field.type, field.id);
	}
	return { fields, unknown: { ...raw.unknown } };
}
