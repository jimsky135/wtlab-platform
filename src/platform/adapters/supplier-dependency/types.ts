// Supplier Dependency adapter contracts. Adapters convert confirmed intake
// data into the instrument's own standard input structures — field mapping,
// type conversion only. No dependency classification, no result formatting.

import type { SupplierDependencyQuickRawInput } from '../../../tools/supplier-dependency-radar/types.ts';

// AdapterOutcome is the shared adapter contract (promoted Sprint 004).
export type { AdapterOutcome } from '../types.ts';

/** One quick-mode supplier ready for the existing single-supplier engine. */
export interface SupplierDependencyQuickAdapterItem {
	supplierName: string;
	input: SupplierDependencyQuickRawInput;
}
