// Shared instrument-page UI wiring (Sprint 005: promoted after the same
// responsibility appeared in Water Level, Arrival Collision, and Dead
// Stock pages). Instrument-agnostic by contract: nothing here knows an
// instrument name. Browser-only — never import from Node tests.

import { el } from './intake-ui.ts';

/**
 * Wires mode switching by convention: buttons carry `.mode-btn` +
 * `data-mode`, panels carry id `panel-{modeId}`. The first button's
 * aria-pressed state in the markup decides the initial mode.
 */
export function initModeSwitcher() {
	const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.mode-btn'));
	for (const button of buttons) {
		button.addEventListener('click', () => {
			for (const other of buttons) {
				other.setAttribute('aria-pressed', other === button ? 'true' : 'false');
			}
			for (const other of buttons) {
				const panel = document.getElementById(`panel-${other.dataset.mode}`);
				if (panel) panel.hidden = other !== button;
			}
		});
	}
}

/**
 * Lands an instrument on a worked example instead of an empty form: runs
 * it once against the values already rendered into the form, so a
 * first-time visitor sees real output before typing anything.
 *
 * The sample stays labelled until the visitor submits their own numbers —
 * results on screen that are not the visitor's data have to say so. Any
 * element carrying `data-sample-marker` is hidden on that first submit.
 */
export function initSampleRun(trigger: EventTarget | null, run: () => void, eventName = 'submit') {
	if (!trigger) return;
	trigger.addEventListener(
		eventName,
		() => {
			for (const marker of document.querySelectorAll<HTMLElement>('[data-sample-marker]')) {
				marker.hidden = true;
			}
		},
		{ once: true }
	);

	// Result renderers scroll their block into view — correct after a real
	// submit, wrong on load, where it would drop the visitor past the form
	// they are meant to see first. The render is synchronous, so restoring
	// the offset straight after it keeps the page where it landed.
	const { scrollX, scrollY } = window;
	run();
	window.scrollTo(scrollX, scrollY);
}

export interface RowTableField {
	id: string;
	placeholder?: string;
}

/**
 * Fixed-column dynamic row table: add/remove rows, collect values keyed
 * by field id. Starts with one empty row. (The Water Level advanced
 * period-matrix table is a different responsibility and stays
 * instrument-specific.)
 */
export function setupRowTable(
	bodyId: string,
	fields: readonly RowTableField[],
	removeLabel = 'Remove',
	/** Rows to seed the table with. Omit for the usual single empty row. */
	initialRows?: ReadonlyArray<Record<string, string>>
) {
	const body = document.getElementById(bodyId);

	function addRow(values?: Partial<Record<string, string>>) {
		if (!body) return;
		const row = el('tr');
		for (const field of fields) {
			const cell = el('td');
			const input = el('input');
			input.type = 'text';
			input.dataset.field = field.id;
			input.value = values?.[field.id] ?? '';
			input.setAttribute('aria-label', field.id);
			if (field.placeholder) input.placeholder = field.placeholder;
			cell.appendChild(input);
			row.appendChild(cell);
		}
		const removeCell = el('td');
		const removeBtn = el('button', 'secondary', removeLabel);
		removeBtn.type = 'button';
		removeBtn.addEventListener('click', () => row.remove());
		removeCell.appendChild(removeBtn);
		row.appendChild(removeCell);
		body.appendChild(row);
	}

	function rows(): Array<Record<string, string>> {
		if (!body) return [];
		return Array.from(body.querySelectorAll('tr')).map((row) => {
			const values: Record<string, string> = {};
			for (const input of row.querySelectorAll<HTMLInputElement>('input')) {
				values[input.dataset.field ?? ''] = input.value;
			}
			return values;
		});
	}

	if (initialRows && initialRows.length > 0) {
		for (const values of initialRows) addRow(values);
	} else {
		addRow();
	}
	return { addRow, rows };
}

/**
 * Reads named form controls (input or select) into a plain record,
 * trimmed. Pairs with QuickForm.astro (Sprint 008): callers pass the same
 * field id list used to render the form. Missing/unsupported controls
 * read as ''.
 */
export function collectFormValues(form: HTMLFormElement, fieldIds: readonly string[]): Record<string, string> {
	const values: Record<string, string> = {};
	for (const id of fieldIds) {
		const field = form.elements.namedItem(id);
		values[id] = field instanceof HTMLInputElement || field instanceof HTMLSelectElement ? field.value.trim() : '';
	}
	return values;
}

/**
 * Converts a raw numeric string to months when `unit` is 'day' (1 month
 * = 30 days, the platform's fixed convention — CSV/intake contracts are
 * always months, never a unit column). Non-numeric or blank values pass
 * through unchanged so schema-level validation reports the real problem.
 */
export function toMonthsRaw(value: string, unit: string): string {
	const trimmed = value.trim();
	if (trimmed === '' || unit !== 'day') return trimmed;
	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? String(parsed / 30) : trimmed;
}
