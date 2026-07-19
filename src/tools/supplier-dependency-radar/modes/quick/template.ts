// Quick Check CSV template. Column ids MUST equal the quick intake schema
// field ids — the blank template, the manual-input export, and the
// re-upload contract are one and the same (tested).

import type { CsvTemplateDefinition } from '../../../../platform/templates/types.ts';

export const supplierDependencyQuickTemplate: CsvTemplateDefinition = {
	templateId: 'supplier-dependency-quick-input',
	instrumentId: 'supplier-dependency-radar',
	modeId: 'quick',
	version: '1',
	filename: 'supplier-dependency-quick-input.csv',
	description: 'One row per supplier. Blank optional fields mean unknown. Reusable: download, edit, re-upload.',
	columns: [
		{ id: 'supplierName', required: true, sample: 'example-supplier' },
		{ id: 'materialCount', required: true, sample: '6' },
		{ id: 'criticalMaterialCount', required: true, sample: '2' },
		{ id: 'supplierSharePercent', required: true, sample: '70' },
		{ id: 'singleSourceMaterialCount', required: true, sample: '3' },
		{ id: 'qualifiedSingleSourceMaterialCount', required: true, sample: '1' },
		{ id: 'alternativeSupplierAvailable', required: false, sample: 'true' },
		{ id: 'qualifiedAlternativeAvailable', required: false, sample: 'false' },
		{ id: 'qualificationRequired', required: false, sample: 'true' },
		{ id: 'qualificationLeadTimeMonths', required: false, sample: '9' },
		{ id: 'customerApprovalRequired', required: false, sample: 'true' },
		{ id: 'trialProductionRequired', required: false, sample: 'false' },
		{ id: 'averageLeadTimeDays', required: false, sample: '45' },
		{ id: 'averageDelayDays', required: false, sample: '5' },
		{ id: 'deliveryReliabilityPercent', required: false, sample: '92' },
		{ id: 'agreementCancellationCount', required: false, sample: '0' },
		{ id: 'annualExposureValue', required: false, sample: '250000' },
		{ id: 'estimatedSwitchingTime', required: false, sample: '' },
		{ id: 'notes', required: false, sample: '' },
	],
};
