import type { ToolMetadata } from '../../platform/tool-contract';

/**
 * Naming reference (confirmed decision, not all represented in
 * ToolMetadata — see Task 004 report for the naming-field gap):
 *   Public Display Name:            Water Level Checker
 *   中文顯示名稱：                   庫存水位檢查器
 *   Internal Tool Name / Spec name: Inventory Buffer Check
 *   Tool ID:                        inventory-buffer-check
 */
export const inventoryBufferCheckMetadata: ToolMetadata = {
	id: 'inventory-buffer-check',
	name: 'Water Level Checker',
	description:
		'Quickly check whether current inventory can cover consumption, replenishment lead time, and safety buffer.',
	category: 'supply-chain-inventory',
	version: '0.2',
	status: 'active',
	enabled: true,
};
