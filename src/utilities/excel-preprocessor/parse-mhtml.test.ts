// Fixtures mirror the real SAP MHTML export format confirmed against
// actual company export files during Sprint 010B (MIME multipart,
// Content-Transfer-Encoding: text/html i.e. plain UTF-8 text, `x:str`/
// `x:num` cell attributes) — not copied verbatim (those live outside this
// repo), reconstructed here so the tests are hermetic and portable.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractHtmlPart, MhtmlParseError, parseHtmlTable, parseSapMhtml } from './parse-mhtml.ts';

function sapMhtmlFixture(tableHtml: string): string {
	return [
		'MIME-Version: 1.0',
		'X-Document-Type: Worksheet',
		'Content-Type: multipart/related; boundary="----=_NextPart_TEST"',
		'',
		'------=_NextPart_TEST',
		'Content-Location: file:///C:/Report.htm',
		'Content-Transfer-Encoding: text/html',
		'Content-Type: text/html; charset="utf-8"',
		'',
		`<html><head></head><body>${tableHtml}</body></html>`,
		'------=_NextPart_TEST--',
		'',
	].join('\r\n');
}

const SAMPLE_TABLE = `<table>
<tr><td x:str="物料號碼">物料號碼</td><td x:str="原料名稱">原料名稱</td><td x:str="未限制庫存">未限制庫存</td><td x:str="檢驗中庫存">檢驗中庫存</td><td x:str="廠內庫存可用月數">廠內庫存可用月數</td></tr>
<tr><td x:str="130901000000">130901000000</td><td x:str="AWA白鋼玉5-3">AWA白鋼玉5-3</td><td x:num="97.23">97.23</td><td x:num="0">0</td><td x:num="      4.6">      4.6</td></tr>
<tr><td x:str="130901000001">130901000001</td><td x:str="AWA白鋼玉3-1">AWA白鋼玉3-1</td><td x:num="146.906">146.906</td><td x:num="10">10</td><td x:num="      3.4">      3.4</td></tr>
</table>`;

test('extractHtmlPart pulls the text/html part out of a multipart MHTML document', () => {
	const html = extractHtmlPart(sapMhtmlFixture(SAMPLE_TABLE));
	assert.match(html, /<table>/);
	assert.match(html, /物料號碼/);
});

test('extractHtmlPart rejects an unsupported (base64/quoted-printable) encoding', () => {
	const raw = [
		'Content-Type: multipart/related; boundary="----=_NextPart_TEST"',
		'',
		'------=_NextPart_TEST',
		'Content-Transfer-Encoding: base64',
		'Content-Type: text/html; charset="utf-8"',
		'',
		'PGh0bWw+PC9odG1sPg==',
		'------=_NextPart_TEST--',
	].join('\r\n');
	assert.throws(() => extractHtmlPart(raw), MhtmlParseError);
});

test('extractHtmlPart falls back to treating the input as plain HTML when there is no MIME boundary', () => {
	const html = extractHtmlPart(`<html><body>${SAMPLE_TABLE}</body></html>`);
	assert.match(html, /<table>/);
});

test('extractHtmlPart throws a clear error for a file that is neither MHTML nor HTML', () => {
	assert.throws(() => extractHtmlPart('just some random text, not a report at all'), MhtmlParseError);
});

test('parseHtmlTable reads the header row and data rows via x:str/x:num attributes', () => {
	const table = parseHtmlTable(SAMPLE_TABLE);
	assert.deepEqual(table.headers, ['物料號碼', '原料名稱', '未限制庫存', '檢驗中庫存', '廠內庫存可用月數']);
	assert.equal(table.rows.length, 2);
	assert.deepEqual(table.rows[0], ['130901000000', 'AWA白鋼玉5-3', '97.23', '0', '      4.6']);
});

test('parseHtmlTable throws a clear error when no <table> is present', () => {
	assert.throws(() => parseHtmlTable('<html><body><p>no table here</p></body></html>'), MhtmlParseError);
});

test('parseHtmlTable falls back to stripped inner text when a cell has neither x:str nor x:num', () => {
	const table = parseHtmlTable('<table><tr><td>Header</td></tr><tr><td>&nbsp;plain &amp; text&nbsp;</td></tr></table>');
	assert.deepEqual(table.headers, ['Header']);
	assert.deepEqual(table.rows[0], ['plain & text']);
});

test('parseSapMhtml runs the full pipeline end to end', () => {
	const table = parseSapMhtml(sapMhtmlFixture(SAMPLE_TABLE));
	assert.equal(table.headers.length, 5);
	assert.equal(table.rows.length, 2);
});
