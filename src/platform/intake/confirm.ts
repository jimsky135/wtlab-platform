// Confirmation gate: errors block, warnings don't. Instrument-ready
// data exists only after this gate — nothing upstream hands data to an
// instrument directly.

import type { MessageCode, MessageParams } from '../message-codes.ts';
import type { ConfirmedIntake, IntakeSchema, IntakeValidationResult } from './types.ts';

export function canConfirm(result: IntakeValidationResult): boolean {
	return result.errorCount === 0 && result.records.length > 0;
}

export type ConfirmOutcome =
	| { confirmed: true; data: ConfirmedIntake }
	| { confirmed: false; reason: string; code: MessageCode; params?: MessageParams };

export function confirmIntake(schema: IntakeSchema, result: IntakeValidationResult): ConfirmOutcome {
	if (result.records.length === 0) {
		return { confirmed: false, reason: 'There is no data to confirm.', code: 'CONFIRM_NO_DATA' };
	}
	if (result.errorCount > 0) {
		return {
			confirmed: false,
			reason: `Confirmation is blocked by ${result.errorCount} error${result.errorCount === 1 ? '' : 's'}.`,
			code: 'CONFIRM_BLOCKED_BY_ERRORS',
			params: { count: result.errorCount },
		};
	}

	return {
		confirmed: true,
		data: {
			schemaId: schema.id,
			confirmedAt: new Date().toISOString(),
			records: result.records.map((record) =>
				Object.fromEntries(schema.fields.map((field) => [field.id, record.fields[field.id]?.value]))
			),
		},
	};
}
