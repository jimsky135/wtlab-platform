import type { ToolMetadata } from '../../platform/tool-contract.ts';

export const leadTimeGapCheckerMetadata: ToolMetadata = {
	id: 'lead-time-gap-checker',
	name: 'Lead Time Gap Checker',
	description: 'Compare replenishment arrival timing against inventory depletion timing and flag gaps.',
	category: 'supply-chain-inventory',
	version: '0.1',
	status: 'active',
	enabled: true,
};
