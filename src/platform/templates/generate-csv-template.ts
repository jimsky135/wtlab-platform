// CSV generation from template definitions. Proper RFC-4180 escaping so
// generated files always round-trip through the shared intake parser.

import type { CsvTemplateDefinition } from './types.ts';

export function csvEscape(value: string): string {
	if (/[",\r\n]/.test(value)) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

export function buildCsv(rows: ReadonlyArray<ReadonlyArray<string>>): string {
	return rows.map((row) => row.map(csvEscape).join(',')).join('\n') + '\n';
}

/** Blank template: header + sample row(s) the user overwrites. */
export function generateBlankTemplateCsv(template: CsvTemplateDefinition): string {
	const headers = template.columns.map((column) => column.id);
	const sampleRows =
		template.sampleRows !== undefined
			? template.sampleRows.map((row) => headers.map((header) => row[header] ?? ''))
			: [template.columns.map((column) => column.sample)];
	return buildCsv([headers, ...sampleRows]);
}

/**
 * Reusable input CSV: header + the user's current values. Uses exactly
 * the template headers, so the exported file re-uploads through the
 * same mapping/validation as the blank template.
 */
export function generateInputCsv(
	template: CsvTemplateDefinition,
	rows: ReadonlyArray<Record<string, string | number | undefined>>
): string {
	const headers = template.columns.map((column) => column.id);
	const dataRows = rows.map((row) => headers.map((header) => (row[header] === undefined ? '' : String(row[header]))));
	return buildCsv([headers, ...dataRows]);
}
