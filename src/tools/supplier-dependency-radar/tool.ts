import type { InitializeResult, PlatformContext, Tool } from '../../platform/tool-contract.ts';
import { analyzeSupplierDependency } from './analyze.ts';
import { supplierDependencyRadarMetadata } from './metadata.ts';
import type { SupplierDependencyOutput, SupplierDependencyQuickRawInput, SupplierDependencyQuickValidatedInput } from './types.ts';
import { validateSupplierDependencyQuickInput } from './validate.ts';

function initialize(_context: PlatformContext): InitializeResult {
	return { ready: true };
}

/**
 * Sixth production instrument. The Tool Contract is wired to Quick Check
 * (one supplier's aggregate counts) — same split as Buffer Drift Monitor
 * (Sprint 008): Advanced Scan's portfolio engine (advanced-engine.ts) rolls
 * many supplier-material rows up to this same classification function
 * instead of duplicating it, but isn't itself part of the Tool Contract
 * because its input/output shape (many suppliers, many materials, a
 * portfolio summary) is structurally different from one supplier's result.
 */
export const supplierDependencyRadarTool: Tool<
	SupplierDependencyQuickRawInput,
	SupplierDependencyQuickValidatedInput,
	SupplierDependencyOutput
> = {
	metadata: supplierDependencyRadarMetadata,
	initialize,
	validate: validateSupplierDependencyQuickInput,
	calculate: analyzeSupplierDependency,
};
