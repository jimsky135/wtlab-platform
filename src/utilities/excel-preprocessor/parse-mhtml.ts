// Parses a SAP-exported MHTML "Web Page" file down to a plain table of
// strings. Pure string/regex parsing — no DOM dependency — so this is
// testable with `node --test` the same way as every other WTLab parser
// (e.g. src/platform/intake/csv.ts). Confirmed against real SAP ALV
// exports (Content-Transfer-Encoding: text/html, i.e. NOT base64/
// quoted-printable — the content is plain UTF-8 text after the MIME
// part's blank-line header separator; cells carry `x:str="…"` / `x:num="…"`
// attributes that are preferred over stripped inner text).

import type { ParsedTable } from './types.ts';

export type MhtmlParseErrorCode = 'NO_BOUNDARY' | 'NO_HTML_PART' | 'UNSUPPORTED_ENCODING' | 'NO_TABLE';

export class MhtmlParseError extends Error {
	readonly code: MhtmlParseErrorCode;

	constructor(message: string, code: MhtmlParseErrorCode) {
		super(message);
		this.name = 'MhtmlParseError';
		this.code = code;
	}
}

/** Extracts the `text/html` MIME part's body from a multipart MHTML document. */
export function extractHtmlPart(raw: string): string {
	const boundaryMatch = raw.match(/boundary="?([^"\r\n;]+)"?/i);
	if (!boundaryMatch) {
		// Not multipart — accept a plain .htm/.html export defensively.
		if (/<table[\s>]/i.test(raw)) return raw;
		throw new MhtmlParseError('No MIME boundary found and no <table> present — this does not look like a SAP MHTML export.', 'NO_BOUNDARY');
	}

	const boundary = boundaryMatch[1];
	const parts = raw.split(`--${boundary}`);
	for (const part of parts) {
		if (!/Content-Type:\s*text\/html/i.test(part)) continue;

		const encodingMatch = part.match(/Content-Transfer-Encoding:\s*([\w/-]+)/i);
		const encoding = encodingMatch?.[1]?.toLowerCase();
		if (encoding === 'base64' || encoding === 'quoted-printable') {
			throw new MhtmlParseError(
				`Unsupported MHTML encoding "${encoding}" — this v0.1 only supports the plain-text export SAP produces by default.`,
				'UNSUPPORTED_ENCODING'
			);
		}

		const split = part.split(/\r?\n\r?\n/);
		if (split.length < 2) continue;
		return split.slice(1).join('\n\n');
	}

	throw new MhtmlParseError('No text/html MIME part found in this MHTML file.', 'NO_HTML_PART');
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(text: string): string {
	return text.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (whole, entity: string) => {
		if (entity[0] === '#') {
			const isHex = entity[1] === 'x' || entity[1] === 'X';
			const code = isHex ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
			return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
		}
		return ENTITIES[entity] ?? whole;
	});
}

function stripTags(html: string): string {
	return decodeEntities(html.replace(/<[^>]+>/g, '')).trim();
}

/** One cell's raw value: `x:str`/`x:num` attribute preferred, else stripped inner text. */
function cellValue(attributes: string, innerHtml: string): string {
	const strMatch = attributes.match(/x:str="([^"]*)"/i);
	if (strMatch) return decodeEntities(strMatch[1]);
	const numMatch = attributes.match(/x:num="([^"]*)"/i);
	if (numMatch) return numMatch[1];
	return stripTags(innerHtml);
}

function parseRow(rowHtml: string): string[] {
	const cells: string[] = [];
	const cellPattern = /<td([^>]*)>([\s\S]*?)<\/td>/gi;
	let match: RegExpExecArray | null;
	while ((match = cellPattern.exec(rowHtml)) !== null) {
		cells.push(cellValue(match[1], match[2]));
	}
	return cells;
}

/** Extracts the first `<table>` in the document into a header row + data rows. */
export function parseHtmlTable(html: string): ParsedTable {
	const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
	if (!tableMatch) {
		throw new MhtmlParseError('No <table> element found in the exported HTML.', 'NO_TABLE');
	}

	const rowMatches = tableMatch[1].match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
	const parsedRows = rowMatches.map(parseRow).filter((row) => row.length > 0);

	const [headers, ...rows] = parsedRows;
	return { headers: headers ?? [], rows };
}

/** End-to-end: raw MHTML file text → { headers, rows }. */
export function parseSapMhtml(raw: string): ParsedTable {
	const html = extractHtmlPart(raw);
	return parseHtmlTable(html);
}
