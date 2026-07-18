// Browser-side shared intake UI helpers (Sprint 004: extracted from the
// Water Level page so every instrument reuses one CSV upload → map →
// validate → confirm flow and one issue/download presentation).
// Instrument-agnostic: everything is driven by the intake schema passed
// in. This module is DOM code — never import it from Node tests.

import type { CommonText } from '../i18n/types.ts';
import { canConfirm, confirmIntake } from '../platform/intake/confirm.ts';
import { parseCsv, type CsvParseResult } from '../platform/intake/csv.ts';
import { applyMapping, suggestMapping, validateMapping, type ColumnMapping } from '../platform/intake/mapping.ts';
import type { ConfirmedIntake, IntakeIssue, IntakeSchema, IntakeValidationResult } from '../platform/intake/types.ts';
import { validateRecords } from '../platform/intake/validate.ts';

/** Locale-specific labels for setupCsvIntake(), sourced by each caller from getDictionary(locale).common.csvIntake. */
export type CsvIntakeLabels = CommonText['csvIntake'];

function formatCountsLine(template: string, counts: { imported: number; valid: number; warnings: number; errors: number }): string {
	return template
		.replace('{imported}', String(counts.imported))
		.replace('{valid}', String(counts.valid))
		.replace('{warnings}', String(counts.warnings))
		.replace('{errors}', String(counts.errors));
}

export function download(filename: string, mime: string, content: string) {
	const blob = new Blob([content], { type: mime });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}

export function issueText(issue: IntakeIssue, rowPrefix = 'Row'): string {
	const location = issue.row !== undefined ? `${rowPrefix} ${issue.row + 1}` : null;
	const field = issue.field ? `“${issue.field}”` : null;
	const prefix = [location, field].filter(Boolean).join(' · ');
	return `${issue.severity.toUpperCase()} — ${prefix ? `${prefix}: ` : ''}${issue.message}`;
}

export function renderIssues(target: HTMLElement | null, issues: IntakeIssue[], rowPrefix = 'Row') {
	if (!target) return;
	target.innerHTML = '';
	if (issues.length === 0) {
		target.hidden = true;
		return;
	}
	const list = document.createElement('ul');
	for (const issue of issues) {
		const item = document.createElement('li');
		item.textContent = issueText(issue, rowPrefix);
		list.appendChild(item);
	}
	target.appendChild(list);
	target.hidden = false;
}

export function el<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	className?: string,
	text?: string
): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
}

/**
 * Mounts the shared CSV intake flow (file → parse → map → validate →
 * counts/issues → confirm) into a container. Calls `onConfirmed` with
 * the confirmed intake when the user confirms.
 */
export function setupCsvIntake(
	containerId: string,
	schema: IntakeSchema,
	onConfirmed: (confirmed: ConfirmedIntake) => void,
	labels: CsvIntakeLabels
) {
	const container = document.getElementById(containerId);
	if (!container) return;

	const fileField = el('div', 'field');
	const fileLabel = el('label', undefined, labels.fileLabel);
	const fileInput = el('input');
	fileInput.type = 'file';
	fileInput.accept = '.csv,text/csv';
	fileInput.id = `${containerId}-file`;
	fileLabel.htmlFor = fileInput.id;
	fileField.append(fileLabel, fileInput);

	const parseIssues = el('div', 'issue-box');
	parseIssues.hidden = true;
	const mappingBox = el('div', 'mapping-box');
	mappingBox.hidden = true;
	const countsLine = el('p', 'counts-line');
	countsLine.hidden = true;
	const validationIssues = el('div', 'issue-box');
	validationIssues.hidden = true;
	const confirmBtn = el('button', 'primary', labels.confirmRun);
	confirmBtn.type = 'button';
	confirmBtn.hidden = true;
	container.append(fileField, parseIssues, mappingBox, countsLine, validationIssues, confirmBtn);

	let currentParse: CsvParseResult | null = null;
	let currentResult: IntakeValidationResult | null = null;

	function reviewMapping() {
		if (!currentParse) return;
		const mapping: ColumnMapping = {};
		for (const select of mappingBox.querySelectorAll<HTMLSelectElement>('select')) {
			mapping[select.dataset.header ?? ''] = select.value === '' ? null : select.value;
		}
		const mappingIssues = validateMapping(mapping, schema);
		if (mappingIssues.some((issue) => issue.severity === 'error')) {
			renderIssues(validationIssues, mappingIssues, labels.rowPrefix);
			countsLine.hidden = true;
			confirmBtn.hidden = true;
			return;
		}
		const result = validateRecords(applyMapping(currentParse, mapping), schema);
		currentResult = result;

		const imported = result.records.length;
		const errorRows = new Set(
			result.issues.filter((issue) => issue.severity === 'error' && issue.row !== undefined).map((issue) => issue.row)
		).size;
		countsLine.textContent = formatCountsLine(labels.countsLine, {
			imported,
			valid: imported - errorRows,
			warnings: result.warningCount,
			errors: result.errorCount,
		});
		countsLine.hidden = false;
		renderIssues(validationIssues, result.issues.filter((issue) => issue.severity !== 'info'), labels.rowPrefix);
		confirmBtn.hidden = false;
		confirmBtn.disabled = !canConfirm(result);
	}

	fileInput.addEventListener('change', async () => {
		const file = fileInput.files?.[0];
		if (!file) return;
		currentResult = null;
		confirmBtn.hidden = true;
		countsLine.hidden = true;
		validationIssues.hidden = true;
		currentParse = parseCsv(await file.text(), file.name);
		renderIssues(parseIssues, currentParse.issues.filter((issue) => issue.severity === 'error'), labels.rowPrefix);
		mappingBox.innerHTML = '';
		if (!currentParse.ok) {
			mappingBox.hidden = true;
			return;
		}
		const suggested = suggestMapping(currentParse.headers, schema);
		mappingBox.appendChild(el('p', 'section-note', labels.mappingNote));
		currentParse.headers.forEach((header, index) => {
			const row = el('div', 'mapping-row');
			const label = el('label', undefined, header);
			const selectId = `${containerId}-map-${index}`;
			label.htmlFor = selectId;
			const select = el('select');
			select.id = selectId;
			select.dataset.header = header;
			const none = el('option', undefined, labels.keepAsUnknown);
			none.value = '';
			select.appendChild(none);
			for (const field of schema.fields) {
				const option = el('option', undefined, field.label);
				option.value = field.id;
				if (suggested[header] === field.id) option.selected = true;
				select.appendChild(option);
			}
			row.append(label, select);
			mappingBox.appendChild(row);
		});
		const applyBtn = el('button', 'secondary', labels.applyMapping);
		applyBtn.type = 'button';
		applyBtn.addEventListener('click', reviewMapping);
		mappingBox.appendChild(applyBtn);
		mappingBox.hidden = false;
	});

	confirmBtn.addEventListener('click', () => {
		if (!currentResult) return;
		const outcome = confirmIntake(schema, currentResult);
		if (outcome.confirmed) onConfirmed(outcome.data);
	});
}
