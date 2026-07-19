import type { ToolMetadata } from '../../platform/tool-contract.ts';

export const bufferDriftMonitorMetadata: ToolMetadata = {
	id: 'buffer-drift-monitor',
	name: 'Buffer Drift Monitor',
	description: 'Track how actual safety buffers drift away from their intended levels over time.',
	category: 'supply-chain-inventory',
	version: '0.1',
	status: 'active',
	enabled: true,
};
