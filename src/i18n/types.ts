// i18n foundation types. Presentation-only: nothing here is a machine
// contract. Locale keys never appear in schema field ids, CSV headers,
// reason codes, or Tool/Template/Mode ids — see docs/adr for the
// locale-neutral machine contract policy.

import type { MessageCode } from '../platform/message-codes.ts';

export type Locale = 'en' | 'zh-TW';

export interface CatalogEntryText {
	displayName: string;
	shortName?: string;
	description: string;
	coreQuestion: string;
}

export interface ModeText {
	label: string;
	description: string;
}

export interface StatusTagText {
	status: Record<'draft' | 'prototype' | 'beta' | 'available' | 'archived', string>;
	implementationState: Record<'placeholder' | 'partial' | 'implemented', string>;
	disabled: string;
}

export interface CapabilityPanelText {
	heading: string;
	future: string;
	labels: Record<
		'manual-input' | 'csv-import' | 'calculate' | 'save' | 'export' | 'email-copy' | 're-import' | 'ai-handoff',
		string
	>;
}

export interface CommonText {
	brandTagline: string;
	footer: string;
	versionLabel: string;
	optionalWord: string;
	statusTag: StatusTagText;
	capabilityPanel: CapabilityPanelText;
	modeHeading: string;
	relatedHeading: string;
	unavailable: {
		kicker: string;
		heading: string;
		backLink: string;
	};
	continuity: {
		heading: string;
		note: string;
		planned: string;
		actions: Record<'save' | 'export' | 'email-copy' | 're-import' | 'ai-handoff', { label: string; description: string }>;
	};
	/** Labels for the shared setupCsvIntake() UI (src/shared/intake-ui.ts). */
	csvIntake: {
		fileLabel: string;
		mappingNote: string;
		keepAsUnknown: string;
		countsLine: string;
		applyMapping: string;
		confirmRun: string;
		rowPrefix: string;
	};
	/** Label for the shared setupRowTable() remove-row button (src/shared/instrument-ui.ts). */
	removeRow: string;
}

export interface NavigationText {
	brandSuffix: string;
	items: {
		today: string;
		instruments: string;
		workspaces: string;
		continuity: string;
		about: string;
	};
	headerNote: string;
	languageSwitcher: {
		en: string;
		zhTW: string;
	};
}

export interface InstrumentsPageText {
	kicker: string;
	heading: string;
	lede: string;
	openInstrument: string;
	prototypePlanned: string;
	coreQuestionLabel: string;
}

export interface InstrumentPlaceholderText {
	kickerPrefix: string;
	purposeLabel: string;
	coreQuestionLabel: string;
	categoryLabel: string;
	relatedPrototypesLabel: string;
	relatedPrototypesNote: string;
	notice: string;
	backLink: string;
}

export interface WorkspacesPageText {
	kicker: string;
	heading: string;
	lede: string;
}

export interface WorkspacePlaceholderText {
	kickerPrefix: string;
	purposeLabel: string;
	coreQuestionLabel: string;
	relatedPrototypesLabel: string;
	notice: string;
	backLink: string;
}

export interface HomeText {
	tagline: string;
	toolsKicker: string;
	emptyState: string;
}

export interface AboutText {
	kicker: string;
	heading: string;
	lede: string;
	boundaries: Array<{ term: string; definition: string }>;
	note: string;
}

export interface ContinuityPageText {
	kicker: string;
	heading: string;
	lede: string;
	boundaryNote: string;
}

export interface CommandText {
	kicker: string;
	heading: string;
	demoTag: string;
	summaryHeading: string;
	summaryLabels: { activeReviews: string; pendingDecisions: string; openQuestions: string; newObservations: string };
	focusHeading: string;
	focusLabels: { entity: string; stage: string; observations: string; reviewQuestion: string };
	workspacesHeading: string;
	instrumentsHeading: string;
	continuityHeading: string;
	continuityNote: string;
}

export interface DataIntakeText {
	kicker: string;
	heading: string;
	lede: string;
	statusLine: string;
	statusLabels: Record<'empty' | 'editing' | 'parsing' | 'mapping' | 'validation-failed' | 'ready' | 'confirmed', string>;
	manualHeading: string;
	schemaLabel: string;
	requiredMarker: string;
	optionalMarker: string;
	reviewEntry: string;
	csvHeading: string;
	csvNote: string;
	fileLabel: string;
	mappingHeading: string;
	mappingNote: string;
	applyMapping: string;
	previewHeading: string;
	previewNote: string;
	groupErrors: string;
	groupErrorsNote: string;
	groupWarnings: string;
	groupWarningsNote: string;
	groupNotes: string;
	groupNotesNote: string;
	confirmButton: string;
	confirmReasonBlocked: string;
	confirmReasonWarnings: string;
	confirmReasonOk: string;
	confirmedHeading: string;
	confirmedNote: string;
	demoSchemaTitle: string;
	demoFields: { itemName: string; quantity: string; unit: string; note: string };
	demoFieldDescriptions: { itemName: string; quantity: string; unit: string; note: string };
	keepAsUnknown: string;
	unknownSuffix: string;
	rowPrefix: string;
	rawValueTooltip: string;
	rawNote: string;
	errorSuffix: string;
	warningSuffix: string;
}

/** Per-instrument presentation used by the three production instrument pages. */
export interface InstrumentResultText {
	modeLabel: Record<string, string>;
	fields: Record<string, { label: string; optional?: string }>;
	buttons: Record<string, string>;
	headings: Record<string, string>;
	labels: Record<string, string>;
}

export interface ResultsText {
	inventoryBufferCheck: InstrumentResultText & {
		riskStatus: Record<'safe' | 'caution' | 'high-risk', { label: string; description: string }>;
		arrivalRisk: Record<'possible-shortage' | 'can-cover-until-arrival' | 'arrival-time-not-provided', string>;
	};
	arrivalCollisionDetector: InstrumentResultText & {
		collisionLevel: Record<'none' | 'moderate' | 'severe', string>;
	};
	deadStockScanner: InstrumentResultText & {
		classification: Record<'healthy' | 'slow-moving' | 'dormant' | 'dead-stock' | 'excess-exposure', string>;
		/** Sprint 006 Task 012 finding: dormancyStatus was rendered raw/untranslated. */
		dormancyStatus: Record<'active' | 'dormant' | 'long-dormant' | 'unknown', string>;
		/** Sprint 006 Task 012 finding: priority was rendered raw/untranslated. */
		priority: Record<'high' | 'medium' | 'low', string>;
	};
	/** Fourth production instrument (Sprint 007) — validates the Instrument Factory. */
	leadTimeGapChecker: InstrumentResultText & {
		risk: Record<'safe' | 'warning' | 'gap-risk' | 'critical-gap', { label: string; description: string }>;
	};
	/** Fifth production instrument (Sprint 008) — first built on the Quick Form Generator. */
	bufferDriftMonitor: InstrumentResultText & {
		status: Record<
			'on-target' | 'under-buffered' | 'severely-under-buffered' | 'over-buffered' | 'severely-over-buffered',
			{ label: string; description: string }
		>;
		trend: Record<'widening' | 'narrowing' | 'stable', string>;
	};
}

export interface Dictionary {
	locale: Locale;
	htmlLang: string;
	seo: { titleSuffix: string };
	common: CommonText;
	nav: NavigationText;
	home: HomeText;
	instrumentsPage: InstrumentsPageText;
	instrumentPlaceholder: InstrumentPlaceholderText;
	workspacesPage: WorkspacesPageText;
	workspacePlaceholder: WorkspacePlaceholderText;
	about: AboutText;
	continuityPage: ContinuityPageText;
	command: CommandText;
	dataIntake: DataIntakeText;
	/** Catalog presentation overlay, keyed by instrument id. */
	instruments: Record<string, CatalogEntryText>;
	/** Catalog presentation overlay, keyed by workspace id. */
	workspaces: Record<string, CatalogEntryText>;
	/** Mode presentation overlay, keyed by `${instrumentId}.${modeId}`. */
	modes: Record<string, ModeText>;
	results: ResultsText;
	/**
	 * Structured message templates (Sprint 006, Task 015). Keyed by the
	 * stable, locale-neutral `MessageCode` vocabulary business logic emits.
	 * `Record<MessageCode, string>` gives EN/zh-TW key parity at compile
	 * time — a code missing from either dictionary is a type error.
	 * `{param}` placeholders are interpolated by src/i18n/resolveMessage.ts.
	 */
	messages: Record<MessageCode, string>;
}
