// Buffer Drift adapter contracts. Adapters convert confirmed intake data
// into the instrument's own standard input structures — field mapping,
// type conversion only. No drift math, no result formatting.

import type { BufferDriftRawInput } from '../../../tools/buffer-drift-monitor/types.ts';

// AdapterOutcome is the shared adapter contract (promoted Sprint 004).
export type { AdapterOutcome } from '../types.ts';

/** One quick-mode item ready for the existing single-item engine. */
export interface BufferDriftQuickAdapterItem {
	itemName: string;
	input: BufferDriftRawInput;
}
