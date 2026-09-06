import type { ToolMetadata } from '../../platform/tool-contract.ts';

export const demandWaveRadarMetadata: ToolMetadata = {
	id: 'demand-wave-radar',
	name: 'Demand Wave Radar',
	description:
		'Compare monthly averages measured over different windows of the same history, and hold defensive coverage against the highest of them.',
	category: 'supply-chain-inventory',
	version: '0.1',
	status: 'active',
	enabled: true,
};
