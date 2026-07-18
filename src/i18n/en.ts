// English dictionary — the default locale. Structured as one file
// (rather than the suggested per-domain split) because a single
// `satisfies Dictionary` gives TypeScript completeness-checking for
// free; sections below are commented to mirror the domains the sprint
// brief suggested (common / navigation / instruments / workspaces /
// results).

import type { Dictionary } from './types.ts';

export const en = {
	locale: 'en',
	htmlLang: 'en',
	seo: { titleSuffix: 'WTLab' },

	// ---- common ----
	common: {
		brandTagline: 'A modular platform of independent tools and widgets.',
		footer: 'WTLab — instruments for operational judgment.',
		versionLabel: 'Version',
		optionalWord: 'optional',
		statusTag: {
			status: { draft: 'Draft', prototype: 'Prototype', beta: 'Beta', available: 'Available', archived: 'Archived' },
			implementationState: { placeholder: 'Placeholder', partial: 'Partial build', implemented: 'Implemented' },
			disabled: 'Disabled',
		},
		capabilityPanel: {
			heading: 'Capabilities',
			future: 'Future',
			labels: {
				'manual-input': 'Manual Input',
				'csv-import': 'CSV Import',
				calculate: 'Calculation',
				save: 'Save',
				export: 'Export',
				'email-copy': 'Email Copy',
				're-import': 'Re-import',
				'ai-handoff': 'AI Handoff',
			},
		},
		modeHeading: 'Mode',
		relatedHeading: 'Related',
		unavailable: {
			kicker: 'WTLab',
			heading: 'This tool is not currently available.',
			backLink: '← Back to Instrument Library',
		},
		continuity: {
			heading: 'Continuity',
			note: 'Input CSVs are your reusable data files — download, edit, re-upload. Result CSVs are for records and sharing and are not re-importable. Planned capabilities below are not yet functional.',
			planned: 'Planned',
			actions: {
				save: { label: 'Save', description: 'Persist the current working state as a portable package.' },
				export: { label: 'Export', description: 'Download results in an open format (CSV / JSON).' },
				'email-copy': { label: 'Email Copy', description: 'Send a copy of the current results to your own inbox.' },
				're-import': { label: 'Re-import', description: 'Load a previously exported package back into WTLab.' },
				'ai-handoff': {
					label: 'Prepare for AI',
					description: 'Package current context so an AI assistant can continue the analysis.',
				},
			},
		},
		csvIntake: {
			fileLabel: 'CSV file',
			mappingNote: 'Column mapping — exact matches are pre-selected. Review, then apply.',
			keepAsUnknown: '— keep as unknown —',
			countsLine: 'Imported rows: {imported} · Valid rows: {valid} · Warnings: {warnings} · Errors: {errors}',
			applyMapping: 'Apply Mapping & Review',
			confirmRun: 'Confirm & Run',
			rowPrefix: 'Row',
		},
		removeRow: 'Remove',
	},

	// ---- navigation ----
	nav: {
		brandSuffix: 'Lab',
		items: { today: 'Today', instruments: 'Instruments', workspaces: 'Workspaces', continuity: 'Continuity', about: 'About' },
		headerNote: 'Save / Export — planned',
		languageSwitcher: { en: 'EN', zhTW: '繁中' },
	},

	// ---- homepage ----
	home: {
		tagline: 'A modular platform of independent tools and widgets.',
		toolsKicker: 'Tools',
		emptyState: 'No active tools yet.',
	},

	instrumentsPage: {
		kicker: 'Instrument Library',
		heading: 'Instruments',
		lede: 'Each instrument observes or calculates one operational dimension. Entries marked as prototype are known in the product architecture but not yet usable here.',
		openInstrument: 'Open Instrument',
		prototypePlanned: 'Prototype Planned',
		coreQuestionLabel: 'Core question',
	},

	instrumentPlaceholder: {
		kickerPrefix: 'Instrument',
		purposeLabel: 'Purpose',
		coreQuestionLabel: 'Core question',
		categoryLabel: 'Category',
		relatedPrototypesLabel: 'Related prototypes',
		relatedPrototypesNote: '(visual reference only, not part of this build)',
		notice: 'This instrument is planned but not yet implemented. Nothing on this page performs a calculation.',
		backLink: '← Back to Instrument Library',
	},

	workspacesPage: {
		kicker: 'Platform Workspaces',
		heading: 'Workspaces',
		lede: 'Workspaces organize records, entities, observations, and decisions. Instruments measure one dimension; workspaces hold the work itself.',
	},

	workspacePlaceholder: {
		kickerPrefix: 'Workspace',
		purposeLabel: 'Purpose',
		coreQuestionLabel: 'Core question',
		relatedPrototypesLabel: 'Related prototypes',
		notice: 'This workspace is planned but not yet implemented.',
		backLink: '← Back to Workspaces',
	},

	about: {
		kicker: 'About',
		heading: 'WTLab Architecture',
		lede: 'WTLab is a modular platform of independent operational instruments and workspaces. This page is a placeholder; the architecture summary below reflects the current boundaries.',
		boundaries: [
			{ term: 'Instrument', definition: 'Observes or calculates one operational dimension.' },
			{ term: 'Workspace', definition: 'Organizes multiple records, entities, observations, or decisions.' },
			{ term: 'Command Center', definition: 'Routes active work.' },
			{ term: 'Continuity Center', definition: 'Preserves and transfers user work.' },
			{ term: 'Registry', definition: 'Describes platform capabilities. It never executes business logic.' },
		],
		note: 'Calculation results inform decisions; they do not make them. Human judgment stays outside automated results.',
	},

	continuityPage: {
		kicker: 'Continuity Center',
		heading: 'Continuity',
		lede: 'Continuity is how your work survives beyond a browser tab. None of these capabilities are functional yet — they are the planned integration surface. User work will never depend only on browser cookies or local site data.',
		boundaryNote:
			'Future integrations (storage, email delivery, package format) require their own architecture decisions and will be recorded as ADRs before implementation.',
	},

	command: {
		kicker: 'Operational Command Center',
		heading: 'Today',
		demoTag: 'Demo data',
		summaryHeading: 'Today Summary',
		summaryLabels: {
			activeReviews: 'Active Reviews',
			pendingDecisions: 'Pending Decisions',
			openQuestions: 'Open Questions',
			newObservations: 'New Observations',
		},
		focusHeading: 'Current Operational Focus',
		focusLabels: {
			entity: 'Entity',
			stage: 'Stage',
			observations: 'Current observations',
			reviewQuestion: 'Review question',
		},
		workspacesHeading: 'Suggested Workspaces',
		instrumentsHeading: 'Instrument Status',
		continuityHeading: 'Continuity Actions',
		continuityNote:
			'These capabilities are planned, not yet functional. User work will never depend only on browser cookies or local site data.',
	},

	dataIntake: {
		kicker: 'Platform Workspace · Engineering Demonstration',
		heading: 'Data Intake Workspace',
		lede: 'A demonstration of the Shared Data Intake Foundation: raw input → parse → normalize → validate → preview → confirm. This is a platform foundation, not a finished instrument. Your data never leaves this browser.',
		statusLine: 'Status:',
		statusLabels: {
			empty: 'Empty',
			editing: 'Editing',
			parsing: 'Parsing…',
			mapping: 'Mapping columns',
			'validation-failed': 'Validation failed',
			ready: 'Ready for review',
			confirmed: 'Confirmed',
		},
		manualHeading: 'Manual Entry',
		schemaLabel: 'Schema:',
		requiredMarker: '(required)',
		optionalMarker: '(optional)',
		reviewEntry: 'Review Entry',
		csvHeading: 'CSV Import',
		csvNote: 'Choose a local UTF-8 CSV file. The file is read in this browser only — nothing is uploaded.',
		fileLabel: 'CSV file',
		mappingHeading: 'Column Mapping',
		mappingNote:
			'Exact header matches are pre-selected. Review each mapping — unmapped columns are kept as unknown data, not deleted.',
		applyMapping: 'Apply Mapping & Review',
		previewHeading: 'Preview',
		previewNote:
			'Raw is what you supplied; Interpreted is what WTLab will hand to an instrument. Changed values and problems are marked — nothing was altered silently.',
		groupErrors: 'Errors',
		groupErrorsNote: 'Errors block confirmation.',
		groupWarnings: 'Warnings',
		groupWarningsNote: 'Warnings stay visible but do not block confirmation.',
		groupNotes: 'Notes',
		groupNotesNote: 'Notes explain normalization — they do not indicate a problem.',
		confirmButton: 'Confirm Data',
		confirmReasonBlocked: 'Fix the errors above to enable confirmation.',
		confirmReasonWarnings: 'Warnings noted — you may confirm.',
		confirmReasonOk: 'No problems found.',
		confirmedHeading: 'Confirmed — Instrument-Ready Data',
		confirmedNote: 'This is the typed payload a future instrument would receive. It exists only in this browser tab.',
		demoSchemaTitle: 'Item List (Demonstration)',
		demoFields: {
			itemName: 'Item Name',
			quantity: 'Quantity',
			unit: 'Unit',
			note: 'Note',
		},
		demoFieldDescriptions: {
			itemName: 'A name or code identifying the item.',
			quantity: 'A non-negative number.',
			unit: 'Optional unit label (e.g. kg, pcs). Not converted or interpreted.',
			note: 'Optional free text.',
		},
		keepAsUnknown: '— keep as unknown —',
		unknownSuffix: '(unknown)',
		rowPrefix: 'Row',
		rawValueTooltip: 'Raw value',
		rawNote: 'raw',
		errorSuffix: 'error',
		warningSuffix: 'warning',
	},

	// ---- instruments (catalog presentation overlay) ----
	instruments: {
		'inventory-buffer-check': {
			displayName: 'Water Level Checker',
			shortName: 'Water Level',
			description: 'Quickly check whether current inventory can cover consumption, replenishment lead time, and safety buffer.',
			coreQuestion: 'Is current inventory sufficient to cover replenishment lead time and safety buffer?',
		},
		'arrival-collision-detector': {
			displayName: 'Arrival Collision Detector',
			shortName: 'Arrival Collision',
			description: 'Detect incoming shipments that land too close together or overload a single period.',
			coreQuestion: 'Will any expected arrivals collide with each other in the same period?',
		},
		'dead-stock-scanner': {
			displayName: 'Dead Stock Scanner',
			shortName: 'Dead Stock',
			description: 'Surface inventory that has stopped moving and quantify how much capital it locks up.',
			coreQuestion: 'Which items have stopped moving, and how much capital do they tie up?',
		},
		'demand-wave-radar': {
			displayName: 'Demand Wave Radar',
			description: 'Spot acceleration or deceleration in consumption before it breaks the replenishment rhythm.',
			coreQuestion: 'Is demand accelerating beyond what the current buffer assumptions were built for?',
		},
		'lead-time-gap-checker': {
			displayName: 'Lead Time Gap Checker',
			description: 'Compare assumed replenishment lead times against observed reality and flag drift.',
			coreQuestion: 'Are the lead times we plan with still the lead times we actually get?',
		},
		'supplier-dependency-radar': {
			displayName: 'Supplier Dependency Radar',
			description: 'Map how concentrated critical supply is on single suppliers, regions, or routes.',
			coreQuestion: 'Where does a single supplier failure take the whole operation down with it?',
		},
		'buffer-drift-monitor': {
			displayName: 'Buffer Drift Monitor',
			description: 'Track how actual safety buffers drift away from their intended levels over time.',
			coreQuestion: 'Are our safety buffers still the size we decided they should be?',
		},
	},

	workspaces: {
		'command-center': {
			displayName: 'Operational Command Center',
			description: 'Routes active work: today’s reviews, pending decisions, and the current operational focus.',
			coreQuestion: 'What needs my attention right now?',
		},
		'continuity-center': {
			displayName: 'Continuity Center',
			description: 'Preserves and transfers user work: save, export, email copy, re-import, AI handoff.',
			coreQuestion: 'How does my work survive beyond this browser tab?',
		},
		'data-intake': {
			displayName: 'Data Intake Workspace',
			description: 'Bring operational data into WTLab: CSV import, normalization, and validation.',
			coreQuestion: 'How does raw operational data become something instruments can read?',
		},
		entity: {
			displayName: 'Entity Workspace',
			description: 'Organize the materials, products, suppliers, and sites that observations attach to.',
			coreQuestion: 'What are the things we are actually tracking?',
		},
		'decision-priority': {
			displayName: 'Decision Priority Map',
			description: 'Rank open decisions by urgency and impact so review effort goes where it matters.',
			coreQuestion: 'Which decision deserves attention first?',
		},
		'decision-memory': {
			displayName: 'Decision Memory',
			description: 'Keep the record of what was decided, on what evidence, and what would change it.',
			coreQuestion: 'Why did we decide this, and does that reasoning still hold?',
		},
		'relationship-explorer': {
			displayName: 'Operational Relationship Explorer',
			description: 'Explore how entities, observations, and decisions connect to each other.',
			coreQuestion: 'What else does this observation or decision touch?',
		},
		'case-intelligence': {
			displayName: 'Case Intelligence Workspace',
			description: 'Build reviewable cases from observations, hypotheses, and outcomes over time.',
			coreQuestion: 'What story does the accumulated evidence actually tell?',
		},
	},

	// ---- modes ----
	modes: {
		'inventory-buffer-check.quick': { label: 'Quick Check', description: 'How long will current stock cover a single item?' },
		'inventory-buffer-check.advanced': {
			label: 'Advanced Planning',
			description: 'Multi-item, multi-period coverage with consumption and arrival offsets.',
		},
		'arrival-collision-detector.quick': {
			label: 'Quick Check',
			description: 'Do a few upcoming arrivals collide in the same period?',
		},
		'arrival-collision-detector.advanced': {
			label: 'Advanced Planning',
			description: 'Multi-batch arrival timeline with warehouse capacity and container utilization.',
		},
		'dead-stock-scanner.quick': {
			label: 'Quick Check',
			description: 'Is this one item healthy, slow-moving, dormant, or dead stock?',
		},
		'dead-stock-scanner.advanced': {
			label: 'Advanced Scan',
			description: 'Scan many SKUs and quantify excess quantity and capital exposure.',
		},
	},

	// ---- results (per-instrument presentation) ----
	results: {
		inventoryBufferCheck: {
			modeLabel: {},
			fields: {
				itemName: { label: 'Item Name', optional: 'optional — defaults to item-1' },
				currentStock: { label: 'Current Stock' },
				monthlyConsumption: { label: 'Monthly Consumption' },
				leadTime: { label: 'Replenishment Lead Time' },
				safetyBuffer: { label: 'Safety Buffer' },
				inTransitQuantity: { label: 'In-Transit Quantity', optional: 'optional' },
				arrivalTime: { label: 'Expected Arrival Time', optional: 'optional' },
				unit: { label: 'Unit' },
				beginningInventory: { label: 'Beginning Inventory' },
				bufferMonths: { label: 'Buffer (months)' },
			},
			buttons: {
				runQuick: 'Run Quick Check',
				runAdvanced: 'Run Projection',
				downloadInput: 'Download Input CSV',
				downloadTemplate: 'Download Blank Template',
				downloadResultCsv: 'Download Result CSV',
				downloadResultJson: 'Download Result JSON',
				addItem: 'Add Item',
				addPeriod: 'Add Period',
				removePeriod: 'Remove Last Period',
				remove: 'Remove',
			},
			headings: {
				manualEntry: 'Manual Entry — single item',
				uploadCsv: 'Upload CSV — reuse a downloaded input file',
				manualTable: 'Manual Table — multiple items and periods',
				results: 'Results',
				projectionResults: 'Projection Results',
				inventoryStatus: 'Inventory Status',
				coverage: 'Coverage',
				recommendation: 'Recommendation',
				evidenceNotes: 'Evidence & Notes',
				riskPriority: 'Risk Priority',
			},
			labels: {
				currentCoverage: 'Current coverage',
				totalCoverage: 'Total coverage (incl. in-transit)',
				estimatedDepletion: 'Estimated depletion',
				minSafetyStock: 'Minimum safety stock',
				reorderPoint: 'Reorder point',
				arrivalRiskLabel: 'Arrival risk',
				notProvided: 'Not provided',
				uploadCsvNote: 'Upload a previously downloaded {filename} (or the filled blank template). Files are read in this browser only.',
				manualTableNote:
					'Beginning inventory and safety buffer are per item. Consumption and scheduled arrivals are per period. Periods are sequence numbers (month or quarter — your choice, kept consistent).',
				endingBalance: 'ending balance',
				shortage: 'SHORTAGE',
				belowBuffer: 'below buffer',
				ok: 'ok',
				period: 'Period',
				consumption: 'Consumption',
				arrivals: 'Arrivals',
				status: 'Status',
				monthsUnit: 'months',
				daysUnit: 'days',
			},
			riskStatus: {
				safe: { label: 'Safe', description: 'Inventory covers replenishment lead time and safety buffer.' },
				caution: {
					label: 'Caution',
					description: 'Inventory has entered the safety buffer zone. Confirm replenishment or arrival timing.',
				},
				'high-risk': { label: 'High Risk', description: 'Inventory coverage is shorter than the normal replenishment lead time.' },
			},
			arrivalRisk: {
				'possible-shortage': 'Possible shortage before arrival',
				'can-cover-until-arrival': 'Current stock can cover until arrival',
				'arrival-time-not-provided': 'Arrival time not provided',
			},
		},
		arrivalCollisionDetector: {
			modeLabel: {},
			fields: {
				arrivalDate: { label: 'Arrival Date' },
				quantity: { label: 'Quantity' },
				container: { label: 'Container' },
				supplier: { label: 'Supplier' },
				monthlyCapacity: { label: 'Monthly Capacity', optional: 'optional' },
			},
			buttons: {
				addArrival: 'Add Arrival',
				runQuick: 'Run Quick Check',
				runAdvanced: 'Run Planning Analysis',
				downloadInput: 'Download Input CSV',
				downloadTemplate: 'Download Blank Template',
				downloadResult: 'Download Result CSV',
				remove: 'Remove',
			},
			headings: {
				manualEntry: 'Manual Entry — arrival batches',
				uploadCsv: 'Upload CSV — reuse a downloaded input file',
				manualCapacity: 'Manual Entry — batches with warehouse capacity',
				results: 'Results',
				planningResults: 'Planning Results',
				collisionAssessment: 'Collision Assessment',
				warnings: 'Warnings',
				arrivalTimeline: 'Arrival Timeline',
			},
			labels: {
				uploadCsvNote: 'Upload a previously downloaded {filename} (or the filled blank template). Files are read in this browser only.',
				dateFormatNote: 'One row per arrival batch. Dates are ISO format (YYYY-MM-DD).',
				capacityNote: 'Same batch rows as Quick Check, plus an optional monthly warehouse intake capacity.',
				peakPeriod: 'Peak period',
				noArrivals: 'No arrivals.',
				month: 'Month',
				batches: 'Batches',
				containers: 'Containers',
				suppliers: 'Suppliers',
				share: 'Share',
				capacity: 'Capacity',
				over: 'OVER',
				ok: 'ok',
				peakSuffix: '(peak)',
			},
			collisionLevel: { none: 'None', moderate: 'Moderate', severe: 'Severe' },
		},
		deadStockScanner: {
			modeLabel: {},
			fields: {
				item: { label: 'Item Name' },
				currentStock: { label: 'Current Stock' },
				recentMonthlyConsumption: { label: 'Recent Monthly Consumption', optional: '0 = no recent consumption' },
				monthsSinceLastMovement: { label: 'Months Since Last Movement', optional: 'blank = unknown' },
				futureDemand: { label: 'Known Future Demand', optional: '0 = explicitly none; blank = unknown' },
				unitCost: { label: 'Unit Cost', optional: 'enables exposure value' },
				thresholdMonths: { label: 'Coverage Threshold (months)', optional: 'blank = default 12' },
				category: { label: 'Category' },
			},
			buttons: {
				runQuick: 'Run Quick Check',
				runAdvanced: 'Run Scan',
				addItem: 'Add Item',
				downloadInput: 'Download Input CSV',
				downloadTemplate: 'Download Blank Template',
				downloadResult: 'Download Result CSV',
				remove: 'Remove',
			},
			headings: {
				manualEntry: 'Manual Entry — single item',
				uploadCsv: 'Upload CSV — reuse a downloaded input file',
				manualTable: 'Manual Table — many SKUs',
				result: 'Result',
				scanResults: 'Scan Results',
				classification: 'Classification',
				numbers: 'Numbers',
				whyReasonCodes: 'Why (reason codes)',
				portfolioSummary: 'Portfolio Summary',
				topRiskItems: 'Top Risk Items',
				items: 'Items',
			},
			labels: {
				uploadCsvNote: 'Upload a previously downloaded {filename} (or the filled blank template). Files are read in this browser only.',
				manyRowsNote: 'One row per SKU. Blank optional cells mean unknown — the engine never fills them in silently.',
				coverage: 'Coverage',
				noConsumption: 'n/a — no consumption',
				dormancy: 'Dormancy',
				futureDemandSupport: 'Future demand support',
				demandSupportsYes: 'yes — demand covers stock',
				demandSupportsNo: 'no',
				excessQuantity: 'Estimated excess quantity',
				exposureValue: 'Estimated exposure value',
				exposureUnknown: 'unknown (no unit cost)',
				thresholdsNote: 'Thresholds: high coverage {high}m · excess {excess}m · dormant {dormant}m · dead {dead}m',
				items: 'Items',
				totalExcessQuantity: 'Total Excess Quantity',
				estimatedExposure: 'Estimated Capital Exposure',
				exposureLowerBound: 'Lower bound — {count} item(s) have no unit cost.',
				monthsUnit: 'months',
				priority: 'Priority',
				reasons: 'Reasons',
			},
			classification: {
				healthy: 'Healthy',
				'slow-moving': 'Slow Moving',
				dormant: 'Dormant',
				'dead-stock': 'Dead Stock',
				'excess-exposure': 'Excess Exposure',
			},
			dormancyStatus: {
				active: 'Active',
				dormant: 'Dormant',
				'long-dormant': 'Long Dormant',
				unknown: 'Unknown',
			},
			priority: {
				high: 'High',
				medium: 'Medium',
				low: 'Low',
			},
		},
	},

	// ---- structured messages (Sprint 006, Task 015) ----
	// Codes are the stable vocabulary business logic emits; templates here
	// are the only place English prose is composed for them. `{param}`
	// placeholders are interpolated by resolveMessage().
	messages: {
		// Shared Intake — normalization
		WHITESPACE_TRIMMED: 'Surrounding whitespace was removed.',
		BLANK_TREATED_AS_MISSING: 'Blank value treated as missing.',
		INVALID_NUMBER: '"{value}" is not a valid number.',

		// Shared Intake — validation
		REQUIRED_FIELD: '"{field}" is required.',
		NUMBER_TOO_LOW: '"{field}" must be at least {min}.',
		NUMBER_TOO_HIGH: '"{field}" must be at most {max}.',
		NOT_ALLOWED_VALUE: '"{field}" must be one of: {values}.',

		// Shared Intake — CSV parsing
		CSV_FILE_EMPTY: 'The file is empty.',
		CSV_NO_ROWS: 'The file contains no rows.',
		CSV_NO_HEADERS: 'The first row contains no column headers.',
		CSV_BLANK_HEADER: 'A column header is blank.',
		CSV_DUPLICATE_HEADER: 'Duplicate column header: "{field}".',
		CSV_NO_DATA_ROWS: 'The file has headers but no data rows.',
		CSV_ROW_LENGTH_MISMATCH: 'Row {row} has {got} values but there are {expected} columns. The row was kept as-is.',

		// Shared Intake — mapping
		MAPPING_DUPLICATE_DESTINATION: 'Columns {sources} are both mapped to "{field}". Map only one.',
		MAPPING_REQUIRED_FIELD_UNMAPPED: 'Required field "{field}" has no mapped column.',

		// Shared Intake — confirmation
		CONFIRM_NO_DATA: 'There is no data to confirm.',
		CONFIRM_BLOCKED_BY_ERRORS: 'Confirmation is blocked by {count} error(s).',

		// Data Intake workspace demo
		DEMO_QUANTITY_ZERO_WARNING: 'Quantity is zero — confirm this is intended.',

		// Adapters — structural guards
		NO_CONFIRMED_ROWS: 'No confirmed rows to run.',
		ROW_MISSING_ITEM_OR_PERIOD: 'Row is missing an item name or period and cannot be structured.',
		DUPLICATE_PERIOD_FOR_ITEM: 'Item "{name}" has more than one row for period {period}.',
		ITEM_MISSING_BEGINNING_INVENTORY: 'Item "{name}" has no beginning inventory on any of its rows.',

		// Mode schema validateRecord
		ARRIVAL_DATE_INVALID_ISO: '"{field}" must be an ISO date (YYYY-MM-DD), got "{value}".',
		DEAD_STOCK_NO_RECENT_CONSUMPTION_WARNING: 'No recent consumption — item will be assessed as dormant/dead-stock candidate.',
		DEAD_STOCK_FUTURE_DEMAND_UNKNOWN_WARNING: 'Future demand unknown — a dead-stock verdict will be withheld (dormant at most).',
		DEAD_STOCK_UNIT_COST_MISSING_WARNING: 'Unit cost missing — exposure value cannot be estimated for this item.',
		DEAD_STOCK_DEFAULT_THRESHOLDS_USED:
			'Default thresholds used (high coverage {high} months, excess {excess}, dormant {dormant}, dead {dead}).',
		WATER_LEVEL_LEAD_TIME_BLANK: 'Lead Time is blank — it will be treated as 0 months.',
		WATER_LEVEL_SAFETY_BUFFER_BLANK: 'Safety Buffer is blank — it will be treated as 0 months.',

		// Tool Contract validators
		VALIDATE_AT_LEAST_ONE_ARRIVAL: 'At least one arrival is required.',
		VALIDATE_INVALID_MONTH_KEY: 'Arrival {index}: month key "{value}" is not a valid YYYY-MM value.',
		VALIDATE_QUANTITY_NON_NEGATIVE: 'Arrival {index}: quantity must be a non-negative number.',
		VALIDATE_CAPACITY_NON_NEGATIVE: 'Monthly capacity must be a non-negative number.',
		VALIDATE_AT_LEAST_ONE_ITEM: 'At least one item is required.',
		VALIDATE_MISSING_ITEM_ID: 'Item {index}: missing item identifier.',
		VALIDATE_STOCK_NON_NEGATIVE: 'Item {index}: current stock must be a non-negative number.',
		VALIDATE_CONSUMPTION_NON_NEGATIVE: 'Item {index}: recent monthly consumption must be a non-negative number.',
		VALIDATE_THRESHOLD_POSITIVE: 'Threshold {name} must be a positive number.',
		VALIDATE_NUMBER_REQUIRED: '{field} must be a valid number.',
		VALIDATE_NUMBER_NON_NEGATIVE: '{field} must not be negative.',
		VALIDATE_NUMBER_POSITIVE: '{field} must be greater than 0.',

		// Arrival Collision engine narratives
		ARRIVAL_CAPACITY_EXCEEDED: '{month}: total arrivals ({total}) exceed monthly capacity ({capacity}).',
		ARRIVAL_CONCENTRATION_SEVERE: '{month}: {percent}% of all arriving quantity lands in one month across {batches} batches.',
		ARRIVAL_CONCENTRATION_MODERATE: '{month}: {percent}% of arriving quantity concentrates in one month.',
		ARRIVAL_CONTAINER_STACKING: '{month}: {containers} containers land in the same month — check unloading capacity.',
		SUGGESTION_SEVERE: 'Split or reschedule arrivals to spread quantity across adjacent months.',
		SUGGESTION_MODERATE: 'Review whether peak-month arrivals can be staggered.',
		SUGGESTION_NONE: 'No significant arrival concentration detected.',

		// Dead Stock engine narratives
		DEAD_STOCK_WARNING_SLOW_MOVING: 'Coverage significantly exceeds the expected need.',
		DEAD_STOCK_WARNING_DORMANT: 'No recent consumption — classification held back from dead stock only by demand or uncertainty.',
		DEAD_STOCK_WARNING_DEAD_STOCK: 'No recent movement and explicitly no future demand.',
		DEAD_STOCK_WARNING_EXCESS_EXPOSURE: 'Quantity materially exceeds demand-supported inventory.',
		DEAD_STOCK_ACTION_HEALTHY: 'No action needed — keep monitoring.',
		DEAD_STOCK_ACTION_SLOW_MOVING: 'Reduce or pause replenishment; review whether coverage this long is intended.',
		DEAD_STOCK_ACTION_DORMANT: 'Confirm whether future demand is real; if not, plan drawdown or disposal.',
		DEAD_STOCK_ACTION_DEAD_STOCK: 'No consumption and no known demand — plan write-down, disposal, or resale.',
		DEAD_STOCK_ACTION_EXCESS_EXPOSURE: 'Stock materially exceeds supported demand — stop inbound and work down the excess.',
	},
} satisfies Dictionary;
