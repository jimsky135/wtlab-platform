// Utility Registry data (Sprint 010A). Registry-driven pages render from
// this list — no page hardcodes utility metadata, same discipline as
// platform/instruments.ts. This sprint adds the platform only: every entry
// here stays `implementationState: 'placeholder'` until its own
// implementation sprint (Excel Preprocessor ships in Sprint 010B).

import type { UtilityEntry } from './utility-catalog.ts';

export const utilities: readonly UtilityEntry[] = [
	{
		id: 'excel-preprocessor',
		slug: 'excel-preprocessor',
		name: 'Excel Preprocessor',
		shortName: 'Excel Preprocessor',
		description: 'Clean, normalize, and prepare raw Excel files before they enter any downstream workflow.',
		category: 'data-preparation',
		status: 'coming-soon',
		route: '/utilities/excel-preprocessor',
		icon: '📄',
		inputType: 'Excel (.xlsx)',
		outputType: 'Structured data (CSV / JSON)',
		implementationState: 'placeholder',
	},
];
