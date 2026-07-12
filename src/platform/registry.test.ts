import assert from 'node:assert/strict';
import { test } from 'node:test';
import { platformRegistry } from './registry.ts';

const INVENTORY_BUFFER_CHECK_ID = 'inventory-buffer-check';

// Case 7 — the registered Inventory Buffer Check tool can be found by id.
test('Case 7 — Inventory Buffer Check can be looked up by id', () => {
	const tool = platformRegistry.getById(INVENTORY_BUFFER_CHECK_ID);
	assert.ok(tool);
	assert.equal(tool?.metadata.id, INVENTORY_BUFFER_CHECK_ID);
});

// Case 8 — looking up a non-existent tool id has a clear, predictable result.
test('Case 8 — looking up an unknown tool id returns undefined', () => {
	assert.equal(platformRegistry.getById('does-not-exist'), undefined);
	assert.equal(platformRegistry.isAvailable('does-not-exist'), false);
});

// Case 9 — Inventory Buffer Check is currently status:draft, enabled:false,
// so it must not appear in getAvailable(), even though it is registered.
test('Case 9 — draft/disabled Inventory Buffer Check is excluded from available tools', () => {
	const availableIds = platformRegistry.getAvailable().map((tool) => tool.metadata.id);
	assert.ok(!availableIds.includes(INVENTORY_BUFFER_CHECK_ID));
	assert.equal(platformRegistry.isAvailable(INVENTORY_BUFFER_CHECK_ID), false);

	// Confirm this reflects the tool's real, unmodified metadata — the
	// test does not mutate it.
	const tool = platformRegistry.getById(INVENTORY_BUFFER_CHECK_ID);
	assert.equal(tool?.metadata.status, 'draft');
	assert.equal(tool?.metadata.enabled, false);
});
