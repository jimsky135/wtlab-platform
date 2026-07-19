export * from './types.ts';
export { supplierDependencyRadarMetadata } from './metadata.ts';
export {
	analyzeSupplierDependency,
	assembleMaterialReasonCodes,
	classifyMaterialRiskLevel,
	classifySupplierDependencyLevel,
	classifyQualificationDependencyLevel,
	classifySupplyDependencyCondition,
	combineOverallRisk,
	computeDependencyScore,
	deriveSwitchingReadiness,
	RECOMMENDED_ACTION_MESSAGE_CODE,
} from './analyze.ts';
export { validateSupplierDependencyQuickInput } from './validate.ts';
export { computeSupplierDependencyPortfolio } from './portfolio.ts';
export { supplierDependencyAdvancedResultToCsv, supplierDependencyQuickResultToCsv } from './export.ts';
export { supplierDependencyRadarTool } from './tool.ts';
