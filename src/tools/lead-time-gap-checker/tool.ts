import type { InitializeResult, PlatformContext, Tool } from '../../platform/tool-contract.ts';
import { analyzeLeadTimeGap } from './analyze.ts';
import { leadTimeGapCheckerMetadata } from './metadata.ts';
import type { LeadTimeGapOutput, LeadTimeGapRawInput, LeadTimeGapValidatedInput } from './types.ts';
import { validateLeadTimeGapInput } from './validate.ts';

function initialize(_context: PlatformContext): InitializeResult {
	return { ready: true };
}

/** Fourth instrument assembled against the same Tool Contract — Sprint 007 Instrument Factory verification. */
export const leadTimeGapCheckerTool: Tool<LeadTimeGapRawInput, LeadTimeGapValidatedInput, LeadTimeGapOutput> = {
	metadata: leadTimeGapCheckerMetadata,
	initialize,
	validate: validateLeadTimeGapInput,
	calculate: analyzeLeadTimeGap,
};
