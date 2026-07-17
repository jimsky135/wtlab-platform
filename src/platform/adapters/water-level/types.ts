// Water Level adapter contracts. Adapters convert confirmed intake data
// into the instrument's own standard input structures. They map fields,
// convert types, normalize structure, and apply DECLARED defaults — and
// nothing else. No coverage math, no risk rules, no validation that
// duplicates the instrument's own, no result formatting.

import type { InventoryBufferRawInput } from '../../../tools/inventory-buffer-check/types.ts';
import type { IntakeIssue } from '../../intake/types.ts';

/** One quick-mode item ready for the existing single-item engine. */
export interface QuickAdapterItem {
	itemName: string;
	input: InventoryBufferRawInput;
}

export type AdapterOutcome<T> = { ok: true; data: T } | { ok: false; issues: IntakeIssue[] };
