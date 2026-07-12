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

// Task 005's original Case 9 asserted that Inventory Buffer Check (then
// status:draft, enabled:false) was excluded from getAvailable(). Task 006
// §11 changed its metadata to status:active, enabled:true, making that
// premise false — this is superseded by Task 006 Case 1 and Case 2 below,
// which test the tool's current, real availability instead.

// Task 006 Case 1 — after status:active + enabled:true, the tool is
// platform-available.
test('Task 006 Case 1 — Inventory Buffer Check is available after status:active, enabled:true', () => {
	const tool = platformRegistry.getById(INVENTORY_BUFFER_CHECK_ID);
	assert.equal(tool?.metadata.status, 'active');
	assert.equal(tool?.metadata.enabled, true);
	assert.equal(platformRegistry.isAvailable(INVENTORY_BUFFER_CHECK_ID), true);
});

// Task 006 Case 2 — getAvailable() includes Inventory Buffer Check.
test('Task 006 Case 2 — getAvailable() includes Inventory Buffer Check', () => {
	const availableIds = platformRegistry.getAvailable().map((tool) => tool.metadata.id);
	assert.ok(availableIds.includes(INVENTORY_BUFFER_CHECK_ID));
});
