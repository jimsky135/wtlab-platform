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
export function setupRowTable(bodyId: string, fields: readonly RowTableField[]) {
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
		const removeBtn = el('button', 'secondary', 'Remove');
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

	addRow();
	return { addRow, rows };
}
