import type { InitializeResult, PlatformContext, Tool } from '../../platform/tool-contract.ts';
import { analyzeDemandWave } from './analyze.ts';
import { demandWaveRadarMetadata } from './metadata.ts';
import type { DemandWaveOutput, DemandWaveRawInput, DemandWaveValidatedInput } from './types.ts';
import { validateDemandWaveInput } from './validate.ts';

function initialize(_context: PlatformContext): InitializeResult {
	return { ready: true };
}

/** Seventh instrument (Sprint 011) — the last catalog placeholder to be implemented. */
export const demandWaveRadarTool: Tool<DemandWaveRawInput, DemandWaveValidatedInput, DemandWaveOutput> = {
	metadata: demandWaveRadarMetadata,
	initialize,
	validate: validateDemandWaveInput,
	calculate: analyzeDemandWave,
};
