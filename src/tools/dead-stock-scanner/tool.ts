import type { InitializeResult, PlatformContext, Tool } from '../../platform/tool-contract.ts';
import { analyzeDeadStock } from './analyze.ts';
import { deadStockMetadata } from './metadata.ts';
import type { DeadStockAnalysis, DeadStockAnalysisInput } from './types.ts';
import { validateDeadStockInput } from './validate.ts';

function initialize(_context: PlatformContext): InitializeResult {
	return { ready: true };
}

/** Third instrument assembled against the same Tool Contract. */
export const deadStockTool: Tool<DeadStockAnalysisInput, DeadStockAnalysisInput, DeadStockAnalysis> = {
	metadata: deadStockMetadata,
	initialize,
	validate: validateDeadStockInput,
	calculate: analyzeDeadStock,
};
