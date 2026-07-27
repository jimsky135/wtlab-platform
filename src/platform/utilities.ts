// Utility Registry data. Registry-driven pages render from this list — no
// page hardcodes utility metadata, same discipline as platform/instruments.ts.
// Excel Preprocessor shipped its first Reality Validation in Sprint 010B:
// a fixed two-step transformation for the daily SAP Inventory Report
// export, nothing generic yet (see docs/engineering.md Sprint 010B).

import type { UtilityEntry } from './utility-catalog.ts';

export const utilities: readonly UtilityEntry[] = [
	{
		id: 'excel-preprocessor',
		slug: 'excel-preprocessor',
		name: 'Excel Preprocessor',
		shortName: 'Excel Preprocessor',
		description: 'Turn the daily SAP Inventory Report MHTML export into a Total-Inventory-and-comparable-months Excel file, ready for the existing template.',
		category: 'data-preparation',
		status: 'available',
		route: '/utilities/excel-preprocessor',
		icon: '📄',
		inputType: 'SAP MHTML Inventory Report (.mhtml)',
		outputType: 'Excel (.xlsx)',
		implementationState: 'implemented',
	},
];
