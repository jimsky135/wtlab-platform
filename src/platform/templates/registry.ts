// Template registry — pure wiring, like the tool registry. Templates
// are defined next to their instrument mode and registered here.

import { advancedCsvTemplate } from '../../tools/inventory-buffer-check/modes/advanced/template.ts';
import { quickCsvTemplate } from '../../tools/inventory-buffer-check/modes/quick/template.ts';
import type { CsvTemplateDefinition } from './types.ts';

export const csvTemplates: readonly CsvTemplateDefinition[] = [quickCsvTemplate, advancedCsvTemplate];

export function findTemplateById(templateId: string): CsvTemplateDefinition | undefined {
	return csvTemplates.find((template) => template.templateId === templateId);
}
