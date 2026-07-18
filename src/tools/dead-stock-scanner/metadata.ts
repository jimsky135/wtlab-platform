import type { ToolMetadata } from '../../platform/tool-contract.ts';

export const deadStockMetadata: ToolMetadata = {
	id: 'dead-stock-scanner',
	name: 'Dead Stock Scanner',
	description: 'Surface inventory that has stopped moving and quantify how much capital it locks up.',
	category: 'supply-chain-inventory',
	version: '0.1',
	status: 'active',
	enabled: true,
};
