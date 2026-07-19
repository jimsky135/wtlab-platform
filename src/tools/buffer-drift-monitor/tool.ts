import type { InitializeResult, PlatformContext, Tool } from '../../platform/tool-contract.ts';
import { analyzeBufferDrift } from './analyze.ts';
import { bufferDriftMonitorMetadata } from './metadata.ts';
import type { BufferDriftOutput, BufferDriftRawInput, BufferDriftValidatedInput } from './types.ts';
import { validateBufferDriftInput } from './validate.ts';

function initialize(_context: PlatformContext): InitializeResult {
	return { ready: true };
}

/** Fifth instrument — first built after the Quick Form Generator extraction (Sprint 008). */
export const bufferDriftMonitorTool: Tool<BufferDriftRawInput, BufferDriftValidatedInput, BufferDriftOutput> = {
	metadata: bufferDriftMonitorMetadata,
	initialize,
	validate: validateBufferDriftInput,
	calculate: analyzeBufferDrift,
};
