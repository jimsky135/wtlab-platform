import type { InitializeResult, PlatformContext, Tool } from '../../platform/tool-contract';
import { calculateInventoryBuffer } from './calculate';
import { inventoryBufferCheckMetadata } from './metadata';
import type { InventoryBufferOutput, InventoryBufferRawInput, InventoryBufferValidatedInput } from './types';
import { validateInventoryBufferInput } from './validate';

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
