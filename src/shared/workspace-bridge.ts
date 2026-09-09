// Instrument → guest workspace bridge (ADR-0004, Data Bridge v0.2).
//
// One call onto the EXISTING guest workspace API. This is not a second
// persistence layer and holds no schema of its own: an instrument hands
// over the `ConfirmedIntake` its own intake path already produced, keyed by
// its own existing schema id. Nothing is translated, flattened, or merged
// across tools — the shared thing is the transport, not the vocabulary.
//
// Promoted here rather than copied into each view: with seven instruments
// the same twenty lines would otherwise exist seven times.
//
// Browser-only — never imported by Node tests or the Worker.

/**
 * Stores an instrument's current working data so the Integrated Workspace
 * can show it.
 *
 * Three deliberate properties:
 *
 * - **The sample is never stored.** Landing demo values are for reading;
 *   only data the visitor actually entered becomes workspace state.
 * - **Upsert, not append.** The dataset id is the instrument's own schema
 *   id, so one session holds at most one current dataset per mode. This is
 *   working state, not history.
 * - **Non-blocking.** The workspace API belongs to the Worker; on the
 *   static-only deployment it is simply absent. A failure here must never
 *   affect the instrument's own calculation, so the promise is discarded.
 */
export function saveWorkingDataset(
	datasetId: string,
	confirmed: unknown,
	options: { isSample: boolean }
): void {
	if (options.isSample) return;

	void fetch('/api/guest/workspace', {
		method: 'PUT',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ datasetId, payload: JSON.stringify(confirmed) }),
	}).catch(() => {
		// No workspace behind this deployment — the instrument is unaffected.
	});
}
