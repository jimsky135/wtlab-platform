// Excel Preprocessor — Sprint 010B Reality Validation. First real Utility,
// independent of the Instrument Factory (Sprint 010A principle): this
// module has its own vocabulary, not the Tool Contract's
// validate/calculate shape, because a Utility's job is Input →
// Transformation → Output, not Input → Decision Engine → Analysis.
//
// Scope (v0.1, fixed workflow only — see docs/engineering.md Sprint 010B):
// reads one SAP MHTML Inventory Report export, applies exactly two fixed
// transformations, and produces one Excel file compatible with the
// existing manual Excel Template. No generic transform/mapping engine.

export interface ParsedTable {
	/** Header cell text, in original column order. */
	headers: string[];
	/** One array per data row, aligned to `headers` by index. */
	rows: string[][];
}

export type IssueSeverity = 'error' | 'warning';

/**
 * `error` means the affected row (or the whole file) could not be
 * processed and was excluded — never silently guessed. `warning` means
 * processing continued but something needs the user's attention.
 */
export interface ProcessingIssue {
	severity: IssueSeverity;
	message: string;
	/** 1-based data row number, when the issue is row-specific. */
	row?: number;
	column?: string;
}

export type XlsxCellValue = string | number;

export interface TransformResult {
	/** Final header row, in the original column order, with the new Total Inventory column inserted right after 檢驗中庫存 (blank header, matching the existing manually-built template — see Sprint 010B report). */
	headers: string[];
	rows: XlsxCellValue[][];
	issues: ProcessingIssue[];
	summary: {
		/** Rows successfully processed and included in the output. */
		rowCount: number;
		/** Rows present in the source but excluded due to a blocking error. */
		excludedRowCount: number;
		totalInventoryColumnInserted: boolean;
		/** Which of the two "available months" columns were found and numeric-cleaned. */
		monthsColumnsCleaned: string[];
	};
}
