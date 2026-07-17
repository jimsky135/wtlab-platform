// Browser-side CSV parsing. A small RFC-4180 subset parser (quoted
// fields, "" escapes, CR/LF handling) written in-repo — the project has
// no existing CSV dependency and these requirements don't justify one.
// Malformed rows are kept and flagged, never silently discarded.

import type { IntakeIssue } from './types.ts';

export interface CsvParseResult {
	ok: boolean;
	headers: string[];
	/** Data rows as parsed — inconsistent lengths are preserved and flagged. */
	rows: string[][];
	issues: IntakeIssue[];
	rawText: string;
	fileName?: string;
}

/** Splits CSV text into records/fields honoring quotes. */
function tokenize(text: string): string[][] {
	const records: string[][] = [];
	let record: string[] = [];
	let field = '';
	let inQuotes = false;
	let i = 0;

	const pushField = () => {
		record.push(field);
		field = '';
	};
	const pushRecord = () => {
		pushField();
		records.push(record);
		record = [];
	};

	while (i < text.length) {
		const char = text[i];
		if (inQuotes) {
			if (char === '"') {
				if (text[i + 1] === '"') {
					field += '"';
					i += 2;
					continue;
				}
				inQuotes = false;
				i += 1;
				continue;
			}
			field += char;
			i += 1;
			continue;
		}
		if (char === '"') {
			inQuotes = true;
			i += 1;
			continue;
		}
		if (char === ',') {
			pushField();
			i += 1;
			continue;
		}
		if (char === '\r') {
			if (text[i + 1] === '\n') i += 1;
			pushRecord();
			i += 1;
			continue;
		}
		if (char === '\n') {
			pushRecord();
			i += 1;
			continue;
		}
		field += char;
		i += 1;
	}
	// Final field/record (no trailing newline case).
	if (field !== '' || record.length > 0) pushRecord();
	return records;
}

export function parseCsv(text: string, fileName?: string): CsvParseResult {
	const issues: IntakeIssue[] = [];
	const base: Omit<CsvParseResult, 'ok' | 'headers' | 'rows' | 'issues'> = { rawText: text, fileName };

	if (text.trim() === '') {
		issues.push({ severity: 'error', message: 'The file is empty.' });
		return { ok: false, headers: [], rows: [], issues, ...base };
	}

	const records = tokenize(text).filter(
		// Drop fully blank trailing lines (a single empty field), keep everything else.
		(record) => !(record.length === 1 && record[0].trim() === '')
	);

	if (records.length === 0) {
		issues.push({ severity: 'error', message: 'The file contains no rows.' });
		return { ok: false, headers: [], rows: [], issues, ...base };
	}

	const headers = records[0].map((header) => header.trim());

	if (headers.every((header) => header === '')) {
		issues.push({ severity: 'error', message: 'The first row contains no column headers.' });
		return { ok: false, headers: [], rows: [], issues, ...base };
	}

	const seen = new Set<string>();
	for (const header of headers) {
		if (header === '') {
			issues.push({ severity: 'error', message: 'A column header is blank.' });
			continue;
		}
		if (seen.has(header)) {
			issues.push({ severity: 'error', message: `Duplicate column header: "${header}".`, field: header });
		}
		seen.add(header);
	}

	const rows = records.slice(1);
	if (rows.length === 0) {
		issues.push({ severity: 'error', message: 'The file has headers but no data rows.' });
	}

	rows.forEach((row, index) => {
		if (row.length !== headers.length) {
			issues.push({
				severity: 'warning',
				message: `Row ${index + 1} has ${row.length} values but there are ${headers.length} columns. The row was kept as-is.`,
				row: index,
			});
		}
	});

	const ok = !issues.some((issue) => issue.severity === 'error');
	return { ok, headers, rows, issues, ...base };
}
