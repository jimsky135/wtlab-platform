import type { InitializeResult, PlatformContext, Tool } from '../../platform/tool-contract.ts';
import { analyzeArrivals } from './analyze.ts';
import { arrivalCollisionMetadata } from './metadata.ts';
import type { ArrivalAnalysis, ArrivalAnalysisInput } from './types.ts';
import { validateArrivalInput } from './validate.ts';

function initialize(_context: PlatformContext): InitializeResult {
	// MVP: no external setup required, always ready.
	return { ready: true };
}

/** Second instrument assembled against the same Tool Contract. */
export const arrivalCollisionTool: Tool<ArrivalAnalysisInput, ArrivalAnalysisInput, ArrivalAnalysis> = {
	metadata: arrivalCollisionMetadata,
	initialize,
	validate: validateArrivalInput,
	calculate: analyzeArrivals,
};
