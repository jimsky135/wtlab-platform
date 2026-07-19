// Lead Time Gap adapter contracts. Adapters convert confirmed intake data
// into the instrument's own standard input structures — field mapping,
// type conversion, declared defaults only. No gap/risk math, no result
// formatting (see docs/engineering.md, Shared Adapter Pattern).

import type { LeadTimeGapRawInput } from '../../../tools/lead-time-gap-checker/types.ts';

// AdapterOutcome is the shared adapter contract (promoted Sprint 004).
export type { AdapterOutcome } from '../types.ts';

/** One quick-mode item ready for the existing single-item engine. */
export interface LeadTimeGapQuickAdapterItem {
	itemName: string;
	input: LeadTimeGapRawInput;
}
