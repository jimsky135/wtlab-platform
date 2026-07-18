// Demonstration schema for the Data Intake workspace view. This is demo
// content, deliberately kept out of the shared intake modules — shared
// intake code must stay instrument-agnostic. Field ids stay identical
// across locales (machine contract); label/description are localized.
// The zero-quantity warning carries a code + English fallback like every
// other IntakeIssue (Sprint 006, Task 013) — the view resolves it.

import { getDictionary, type Locale } from '../i18n/index.ts';
import type { IntakeSchema } from '../platform/intake/types.ts';

export function getDemoIntakeSchema(locale: Locale): IntakeSchema {
	const t = getDictionary(locale).dataIntake;
	return {
		id: 'data-intake-demo',
		title: t.demoSchemaTitle,
		fields: [
			{ id: 'itemName', label: t.demoFields.itemName, description: t.demoFieldDescriptions.itemName, type: 'text', required: true },
			{ id: 'quantity', label: t.demoFields.quantity, description: t.demoFieldDescriptions.quantity, type: 'number', required: true, min: 0 },
			{ id: 'unit', label: t.demoFields.unit, description: t.demoFieldDescriptions.unit, type: 'text', required: false },
			{ id: 'note', label: t.demoFields.note, description: t.demoFieldDescriptions.note, type: 'text', required: false },
		],
		validateRecord: (record) =>
			record.fields['quantity']?.value === 0
				? [
						{
							severity: 'warning',
							message: 'Quantity is zero — confirm this is intended.',
							code: 'DEMO_QUANTITY_ZERO_WARNING',
							field: 'quantity',
						},
					]
				: [],
	};
}
