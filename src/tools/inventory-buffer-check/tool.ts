import type { InitializeResult, PlatformContext, Tool } from '../../platform/tool-contract.ts';
import { calculateInventoryBuffer } from './calculate.ts';
import { inventoryBufferCheckMetadata } from './metadata.ts';
import type { InventoryBufferOutput, InventoryBufferRawInput, InventoryBufferValidatedInput } from './types.ts';
import { validateInventoryBufferInput } from './validate.ts';

function initialize(_context: PlatformContext): InitializeResult {
	// MVP: no external setup required, always ready.
	return { ready: true };
}

/**
 * Assembling metadata + initialize/validate/calculate into a `Tool`
 * checks, at compile time, that this tool actually satisfies the
 * platform Tool Contract from Task 003.
 */
export const inventoryBufferCheckTool: Tool<
	InventoryBufferRawInput,
	InventoryBufferValidatedInput,
	InventoryBufferOutput
> = {
	metadata: inventoryBufferCheckMetadata,
	initialize,
	validate: validateInventoryBufferInput,
	calculate: calculateInventoryBuffer,
};
