import type { ToolMetadata } from '../../platform/tool-contract.ts';

export const arrivalCollisionMetadata: ToolMetadata = {
	id: 'arrival-collision-detector',
	name: 'Arrival Collision Detector',
	description: 'Detect incoming shipments that land too close together or too late to prevent a stockout.',
	category: 'supply-chain-inventory',
	version: '0.1',
	status: 'active',
	enabled: true,
};
