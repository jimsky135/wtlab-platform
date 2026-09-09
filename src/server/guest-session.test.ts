import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	GUEST_COOKIE_NAME,
	clearedGuestSessionCookie,
	createGuestSessionId,
	guestSessionCookie,
	isGuestSessionId,
	readGuestSessionId,
} from './guest-session.ts';

test('a generated session id is 256 bits of hex — long enough not to be guessable', () => {
	const id = createGuestSessionId();
	assert.match(id, /^[0-9a-f]{64}$/);
	assert.equal(isGuestSessionId(id), true);
});

test('generated ids do not repeat', () => {
	const ids = new Set(Array.from({ length: 200 }, () => createGuestSessionId()));
	assert.equal(ids.size, 200);
});

test('identity is read from the cookie header and nowhere else', () => {
	const id = createGuestSessionId();
	assert.equal(readGuestSessionId(`${GUEST_COOKIE_NAME}=${id}`), id);
	assert.equal(readGuestSessionId(`other=1; ${GUEST_COOKIE_NAME}=${id}; another=2`), id);
});

test('a missing cookie yields no identity rather than a default one', () => {
	assert.equal(readGuestSessionId(null), null);
	assert.equal(readGuestSessionId(''), null);
	assert.equal(readGuestSessionId('unrelated=value'), null);
});

test('a malformed cookie value is refused, not trusted', () => {
	for (const bad of ['', 'short', 'g'.repeat(64), `${'a'.repeat(63)}`, `${'a'.repeat(65)}`, '../../etc']) {
		assert.equal(readGuestSessionId(`${GUEST_COOKIE_NAME}=${bad}`), null, `accepted ${bad}`);
	}
});

test("a SQL-injection-shaped cookie value never becomes an identity", () => {
	assert.equal(readGuestSessionId(`${GUEST_COOKIE_NAME}=' OR 1=1 --`), null);
});

test('the cookie is HttpOnly, Secure and SameSite by default', () => {
	const cookie = guestSessionCookie(createGuestSessionId());
	assert.match(cookie, /HttpOnly/);
	assert.match(cookie, /Secure/);
	assert.match(cookie, /SameSite=Lax/);
	assert.match(cookie, /Path=\//);
	assert.match(cookie, /Max-Age=\d+/);
});

test('HttpOnly is never dropped, even when Secure is off for local http', () => {
	const cookie = guestSessionCookie(createGuestSessionId(), { secure: false });
	assert.match(cookie, /HttpOnly/);
	assert.doesNotMatch(cookie, /Secure/);
});

test('clearing the session expires the cookie immediately', () => {
	const cookie = clearedGuestSessionCookie();
	assert.match(cookie, /Max-Age=0/);
	assert.match(cookie, /HttpOnly/);
});
