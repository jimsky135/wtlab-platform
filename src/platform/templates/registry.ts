// Template registry — pure wiring, like the tool registry. Templates
// are defined next to their instrument mode and registered here.

import { arrivalAdvancedTemplate } from '../../tools/arrival-collision-detector/modes/advanced/template.ts';
import { arrivalQuickTemplate } from '../../tools/arrival-collision-detector/modes/quick/template.ts';
import { bufferDriftAdvancedTemplate } from '../../tools/buffer-drift-monitor/modes/advanced/template.ts';
import { bufferDriftQuickTemplate } from '../../tools/buffer-drift-monitor/modes/quick/template.ts';
import { deadStockAdvancedTemplate } from '../../tools/dead-stock-scanner/modes/advanced/template.ts';
import { deadStockQuickTemplate } from '../../tools/dead-stock-scanner/modes/quick/template.ts';
import { advancedCsvTemplate } from '../../tools/inventory-buffer-check/modes/advanced/template.ts';
import { quickCsvTemplate } from '../../tools/inventory-buffer-check/modes/quick/template.ts';
import { leadTimeGapAdvancedTemplate } from '../../tools/lead-time-gap-checker/modes/advanced/template.ts';
import { leadTimeGapQuickTemplate } from '../../tools/lead-time-gap-checker/modes/quick/template.ts';
import { supplierDependencyAdvancedTemplate } from '../../tools/supplier-dependency-radar/modes/advanced/template.ts';
import { supplierDependencyQuickTemplate } from '../../tools/supplier-dependency-radar/modes/quick/template.ts';
import type { CsvTemplateDefinition } from './types.ts';

export const csvTemplates: readonly CsvTemplateDefinition[] = [
	quickCsvTemplate,
	advancedCsvTemplate,
	arrivalQuickTemplate,
	arrivalAdvancedTemplate,
	deadStockQuickTemplate,
	deadStockAdvancedTemplate,
	leadTimeGapQuickTemplate,
	leadTimeGapAdvancedTemplate,
	bufferDriftQuickTemplate,
	bufferDriftAdvancedTemplate,
	supplierDependencyQuickTemplate,
	supplierDependencyAdvancedTemplate,
];

export function findTemplateById(templateId: string): CsvTemplateDefinition | undefined {
	return csvTemplates.find((template) => template.templateId === templateId);
}
