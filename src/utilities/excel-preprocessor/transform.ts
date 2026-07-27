// Fixed Transformations (Sprint 010B Reality Validation) — exactly the two
// steps the analyst currently does by hand every day, nothing more:
//
//   1. 總庫存 (Total Inventory) = 未限制庫存 (unrestricted-use stock) +
//      檢驗中庫存 (stock still in quality inspection). Inserted as a new
//      column immediately after 檢驗中庫存, with a BLANK header — matching
//      the analyst's own existing manual convention (confirmed: they add
//      this sum by hand into an unlabeled column in the same position) so
//      the existing downstream Excel Template needs no changes at all.
//   2. 廠內庫存可用月數 / 總庫存可用月數 ("available months") arrive from
//      SAP as whitespace-padded text (e.g. "      4.6"), not a number —
//      stripped and parsed to a real number in place, same column, same
//      header, so Excel can sort/compare/chart them.
//
// Columns are matched by NAME, not position — the source's own column
// order is preserved exactly, and this only requires knowing the four
// column names it operates on, not the full raw header list (which was
// never independently confirmed against a real file — see Sprint 010B
// completion report). Any other column passes through untouched.
//
// No generic transform/mapping engine — this is deliberately a fixed,
// two-step pipeline (see docs/engineering.md Sprint 010B: "Reality First.
// Automation Second. Abstraction Last.").

import type { ParsedTable, ProcessingIssue, TransformResult, XlsxCellValue } from './types.ts';

const UNRESTRICTED_STOCK_COLUMN = '未限制庫存';
const IN_QUALITY_STOCK_COLUMN = '檢驗中庫存';
const MONTHS_COLUMNS = ['廠內庫存可用月數', '總庫存可用月數'];

function normalizeHeader(header: string): string {
	return header.replace(/\s+/g, '').trim();
}

function parseNumber(value: string): number | undefined {
	const trimmed = value.trim();
	if (trimmed === '') return undefined;
	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : undefined;
}

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}

export function applyFixedTransformations(table: ParsedTable): TransformResult {
	const issues: ProcessingIssue[] = [];
	const normalizedHeaders = table.headers.map(normalizeHeader);

	const unrestrictedIndex = normalizedHeaders.indexOf(UNRESTRICTED_STOCK_COLUMN);
	const inQualityIndex = normalizedHeaders.indexOf(IN_QUALITY_STOCK_COLUMN);

	if (unrestrictedIndex === -1 || inQualityIndex === -1) {
		const missing = [
			unrestrictedIndex === -1 ? UNRESTRICTED_STOCK_COLUMN : null,
			inQualityIndex === -1 ? IN_QUALITY_STOCK_COLUMN : null,
		].filter((name): name is string => name !== null);
		issues.push({
			severity: 'error',
			message: `Required column(s) not found in the uploaded file: ${missing.join(', ')}. Cannot compute Total Inventory.`,
		});
		return {
			headers: table.headers,
			rows: [],
			issues,
			summary: { rowCount: 0, excludedRowCount: table.rows.length, totalInventoryColumnInserted: false, monthsColumnsCleaned: [] },
		};
	}

	const insertAt = inQualityIndex + 1;
	const headers = [...table.headers.slice(0, insertAt), '', ...table.headers.slice(insertAt)];

	const monthsSourceIndexes = MONTHS_COLUMNS.map((name) => normalizedHeaders.indexOf(name)).filter((index) => index !== -1);
	const missingMonthsColumns = MONTHS_COLUMNS.filter((name) => !normalizedHeaders.includes(name));
	if (missingMonthsColumns.length > 0) {
		issues.push({
			severity: 'warning',
			message: `Optional "available months" column(s) not found — skipped numeric cleanup for: ${missingMonthsColumns.join(', ')}.`,
		});
	}

	const rows: XlsxCellValue[][] = [];
	let excludedRowCount = 0;

	table.rows.forEach((rawRow, rowIndex) => {
		const rowNumber = rowIndex + 1;
		const unrestricted = parseNumber(rawRow[unrestrictedIndex] ?? '');
		const inQuality = parseNumber(rawRow[inQualityIndex] ?? '');

		if (unrestricted === undefined || inQuality === undefined) {
			issues.push({
				severity: 'error',
				message: `Row ${rowNumber}: "${UNRESTRICTED_STOCK_COLUMN}" or "${IN_QUALITY_STOCK_COLUMN}" is not a valid number ("${rawRow[unrestrictedIndex]}" / "${rawRow[inQualityIndex]}") — row excluded.`,
				row: rowNumber,
			});
			excludedRowCount += 1;
			return;
		}

		const total = round2(unrestricted + inQuality);
		const outRow: XlsxCellValue[] = [...rawRow];
		outRow.splice(insertAt, 0, total);

		for (const sourceIndex of monthsSourceIndexes) {
			const shiftedIndex = sourceIndex >= insertAt ? sourceIndex + 1 : sourceIndex;
			const raw = String(outRow[shiftedIndex] ?? '').trim();
			const parsed = parseNumber(raw);
			if (parsed !== undefined) {
				outRow[shiftedIndex] = parsed;
			} else if (raw !== '') {
				issues.push({
					severity: 'warning',
					message: `Row ${rowNumber}: could not parse "${table.headers[sourceIndex]}" value "${raw}" as a number — left as text.`,
					row: rowNumber,
					column: table.headers[sourceIndex],
				});
			}
		}

		rows.push(outRow);
	});

	return {
		headers,
		rows,
		issues,
		summary: {
			rowCount: rows.length,
			excludedRowCount,
			totalInventoryColumnInserted: true,
			monthsColumnsCleaned: monthsSourceIndexes.map((index) => table.headers[index]),
		},
	};
}
