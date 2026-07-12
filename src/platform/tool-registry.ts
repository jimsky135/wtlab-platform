// Tool Registry — registration / lookup / availability gating only.
// Works purely against `ToolMetadata` and the `Tool` shape from
// tool-contract.ts. Never reads a tool-specific field, never calls
// `initialize`/`validate`/`calculate`, and knows nothing about any
// individual tool's business logic.

import type { Tool, ToolMetadata } from './tool-contract';

/**
 * A registry-held tool with its generics erased to `unknown` — the
 * registry never invokes `validate`/`calculate`, so it never needs the
 * concrete input/output types, only `metadata`.
 */
export type RegisteredTool = Tool<unknown, unknown, unknown>;

/**
 * MVP gating rule: a tool is usable by the platform only when both its
 * own lifecycle is `active` and the platform has it `enabled`. A
 * `draft` or `deprecated` tool is never available, regardless of
 * `enabled`.
 */
export function isPlatformAvailable(metadata: ToolMetadata): boolean {
	return metadata.status === 'active' && metadata.enabled === true;
}

export interface ToolRegistry {
	/** All registered tools, regardless of status/enabled. */
	getAll(): RegisteredTool[];
	/** The tool with this id, or `undefined` if none is registered. */
	getById(id: string): RegisteredTool | undefined;
	/** Only the tools that pass `isPlatformAvailable`. */
	getAvailable(): RegisteredTool[];
	/** Whether the tool with this id is registered and platform-available. */
	isAvailable(id: string): boolean;
}

/** Builds a registry from a fixed list of tools. Registration is by `metadata.id`. */
export function createToolRegistry(tools: RegisteredTool[]): ToolRegistry {
	const byId = new Map<string, RegisteredTool>();
	for (const tool of tools) {
		byId.set(tool.metadata.id, tool);
	}

	function getAll(): RegisteredTool[] {
		return Array.from(byId.values());
	}

	function getById(id: string): RegisteredTool | undefined {
		return byId.get(id);
	}

	function getAvailable(): RegisteredTool[] {
		return getAll().filter((tool) => isPlatformAvailable(tool.metadata));
	}

	function isAvailable(id: string): boolean {
		const tool = getById(id);
		return tool !== undefined && isPlatformAvailable(tool.metadata);
	}

	return { getAll, getById, getAvailable, isAvailable };
}
