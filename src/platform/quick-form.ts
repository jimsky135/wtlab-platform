// Schema-driven Quick Form — shared config type (Sprint 008). Promoted
// after the single-item manual-entry form appeared, hand-rolled, in
// Water Level, Dead Stock, and Lead Time Gap Checker (flagged in Sprint
// 004's engineering.md backlog: "revisit at the 4th instance"). The
// generator itself is a presentation component (src/components/QuickForm.astro);
// this module only holds the config shape every instrument declares.

/** One field on a single-item manual entry form. */
export interface QuickFormFieldConfig {
	/** Schema field id — also the form control's `name`. */
	id: string;
	/** Renders inputmode="decimal" when true, plain text otherwise. */
	numeric: boolean;
	/** Whether the HTML `required` attribute is set (a UX decision — may differ from the intake schema's own `required`, e.g. a field left blank defaults with a warning at intake but should still nudge the user on the form). */
	requiredOnForm: boolean;
	placeholder?: string;
	/**
	 * Pairs this field with a day/month unit <select> sharing the same
	 * row. The unit control's `name` is this id; its value feeds the
	 * instrument's own day→month conversion (see toMonthsRaw in
	 * src/shared/instrument-ui.ts).
	 */
	unitFieldId?: string;
}
