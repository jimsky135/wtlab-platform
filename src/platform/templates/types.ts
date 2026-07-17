// CSV template definitions. A template is the single data contract for
// a mode's blank template, its manual-input export, and its re-upload —
// one schema, three uses. The platform generates CSV from these
// definitions; it never invents columns.

export interface TemplateColumn {
	/** Column id — must equal the corresponding intake schema field id. */
	id: string;
	required: boolean;
	/** Sample value shown in the blank template. */
	sample: string;
	description?: string;
}

export interface CsvTemplateDefinition {
	templateId: string;
	instrumentId: string;
	modeId: string;
	version: string;
	filename: string;
	description: string;
	columns: readonly TemplateColumn[];
	/** Optional multi-row sample for the blank template (long formats). */
	sampleRows?: ReadonlyArray<Record<string, string>>;
}
