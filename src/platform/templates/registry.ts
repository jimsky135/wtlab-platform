// Template registry — pure wiring, like the tool registry. Templates
// are defined next to their instrument mode and registered here.

import { arrivalAdvancedTemplate } from '../../tools/arrival-collision-detector/modes/advanced/template.ts';
import { arrivalQuickTemplate } from '../../tools/arrival-collision-detector/modes/quick/template.ts';
import { advancedCsvTemplate } from '../../tools/inventory-buffer-check/modes/advanced/template.ts';
import { quickCsvTemplate } from '../../tools/inventory-buffer-check/modes/quick/template.ts';
import type { CsvTemplateDefinition } from './types.ts';

export const csvTemplates: readonly CsvTemplateDefinition[] = [
	quickCsvTemplate,
	advancedCsvTemplate,
	arrivalQuickTemplate,
	arrivalAdvancedTemplate,
];

export function findTemplateById(templateId: string): CsvTemplateDefinition | undefined {
	return csvTemplates.find((template) => template.templateId === templateId);
}
