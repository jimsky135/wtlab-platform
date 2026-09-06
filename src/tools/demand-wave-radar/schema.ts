// Demand Wave Radar intake schema — one row per item, one column per
// measurement window.
//
// Single schema, not modes/<mode>/schema.ts: this instrument declares a
// single entry method (manual-input) in the catalog, so there is no mode
// axis to split on and no CSV template contract to keep in step. If a
// second entry method is ever added, this moves under modes/ then — not
// before.
//
// Every window is `required: false` at the intake gate because a missing
// window is legitimate data ("we have no H2 history"). The "at least one
// window" rule can only be judged across the whole record, so it lives in
// validateRecord; the instrument's own validate stays authoritative.

import type { IntakeSchema } from '../../platform/intake/types.ts';
import { DEMAND_WINDOW_IDS } from './types.ts';

const WINDOW_LABELS: Record<(typeof DEMAND_WINDOW_IDS)[number], string> = {
	annual: 'Annual Monthly Average',
	h1: 'H1 Monthly Average',
	h2: 'H2 Monthly Average',
	q1: 'Q1 Monthly Average',
	q2: 'Q2 Monthly Average',
	q3: 'Q3 Monthly Average',
	q4: 'Q4 Monthly Average',
};

export const demandWaveSchema: IntakeSchema = {
	id: 'demand-wave',
	title: 'Demand Wave Radar',
	fields: [
		{
			id: 'itemName',
			label: 'Item Name',
			description: 'SKU or name identifying the item.',
			type: 'text',
			required: false,
		},
		...DEMAND_WINDOW_IDS.map((window) => ({
			id: window,
			label: WINDOW_LABELS[window],
			description: 'Average monthly usage over this window. Leave blank if there is no history for it.',
			type: 'number' as const,
			required: false,
			min: 0,
		})),
	],
	validateRecord: (record) => {
		const provided = DEMAND_WINDOW_IDS.filter((window) => record.fields[window]?.value !== undefined);
		if (provided.length > 0) return [];
		return [
			{
				severity: 'error' as const,
				message: 'Enter at least one monthly average — blank windows are not treated as zero demand.',
				code: 'DEMAND_WAVE_NO_WINDOW_PROVIDED' as const,
			},
		];
	},
};
