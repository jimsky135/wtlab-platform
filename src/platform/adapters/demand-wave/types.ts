// Demand Wave adapter contracts. Adapters convert confirmed intake data
// into the instrument's own standard input structures — field mapping,
// type conversion only. No wave math, no result formatting.

import type { DemandWaveRawInput } from '../../../tools/demand-wave-radar/types.ts';

// AdapterOutcome is the shared adapter contract (promoted Sprint 004).
export type { AdapterOutcome } from '../types.ts';

/** One item ready for the single-item engine. */
export interface DemandWaveAdapterItem {
	itemName: string;
	input: DemandWaveRawInput;
}
