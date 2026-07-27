// Shapes a TransformResult into the plain array-of-arrays `write-excel-file`
// expects. Deliberately pure and dependency-free — the actual `write-excel-file`
// import (browser vs Node subpath) happens at the call site (the Astro
// client script, or a test file), so this module never has to care which
// environment it runs in.

import type { TransformResult, XlsxCellValue } from './types.ts';

export type XlsxSheetData = XlsxCellValue[][];

export function buildSheetData(result: TransformResult): XlsxSheetData {
	return [result.headers, ...result.rows];
}

/** Derives a sensible output filename from the uploaded file's own name. */
export function deriveOutputFilename(inputFilename: string): string {
	const withoutExtension = inputFilename.replace(/\.(mhtml|mht|htm|html)$/i, '');
	return `${withoutExtension || 'inventory-report'}.xlsx`;
}
