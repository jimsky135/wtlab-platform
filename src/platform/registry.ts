// The platform's concrete Tool Registry instance. This is pure wiring —
// importing each tool's already-built `Tool` object and registering it.
// No tool-specific logic lives here.

import { arrivalCollisionTool } from '../tools/arrival-collision-detector/index.ts';
import { inventoryBufferCheckTool } from '../tools/inventory-buffer-check/index.ts';
import { createToolRegistry } from './tool-registry.ts';

export const platformRegistry = createToolRegistry([inventoryBufferCheckTool, arrivalCollisionTool]);
