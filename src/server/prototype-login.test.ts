import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	AUTH_COOKIE_NAME,
	authSessionCookie,
	clearedAuthCookie,
	createAuthenticatedSession,
	readAuthenticatedSessionId,
	sha256Hex,
	signSessionId,
	verifyPrototypeCredentials,
	type PrototypeLoginConfig,
} from './prototype-login.ts';

const SECRET = 'test-secret-not-a-real-key';

async function config(): Promise<PrototypeLoginConfig> {
	return { username: 'guest', passwordSha256: await sha256Hex('guest'), sessionSecret: SECRET };
}

test('the correct prototype credential is accepted', async () => {
	assert.equal(await verifyPrototypeCredentials(await config(), 'guest', 'guest'), true);
});

test('a wrong password is rejected', async () => {
	assert.equal(await verifyPrototypeCredentials(await config(), 'guest', 'wrong'), false);
	assert.equal(await verifyPrototypeCredentials(await config(), 'guest', 'Guest'), false);
	assert.equal(await verifyPrototypeCredentials(await config(), 'guest', 'guest '), false);
});

test('a wrong username is rejected even with the right password', async () => {
	assert.equal(await verifyPrototypeCredentials(await config(), 'admin', 'guest'), false);
});

test('missing or non-string credentials are rejected', async () => {
	const c = await config();
	assert.equal(await verifyPrototypeCredentials(c, undefined, 'guest'), false);
	assert.equal(await verifyPrototypeCredentials(c, 'guest', undefined), false);
	assert.equal(await verifyPrototypeCredentials(c, '', ''), false);
	assert.equal(await verifyPrototypeCredentials(c, {}, []), false);
	assert.equal(await verifyPrototypeCredentials(c, 'guest', { toString: () => 'guest' }), false);
});

test('the password itself is never held — only its hash', async () => {
	const c = await config();
	assert.doesNotMatch(JSON.stringify(c), /guest.*guest/);
	assert.equal(c.passwordSha256, '84983c60f7daadc1cb8698621f802c0d9f9a3c3c295c810748fb048115c186ec');
});

test('a signed session round-trips', async () => {
	const { sessionId, cookieValue } = await createAuthenticatedSession(SECRET);
	const read = await readAuthenticatedSessionId(SECRET, `${AUTH_COOKIE_NAME}=${cookieValue}`);
	assert.equal(read, sessionId);
});

test('each login mints a different session id', async () => {
	const a = await createAuthenticatedSession(SECRET);
	const b = await createAuthenticatedSession(SECRET);
	assert.notEqual(a.sessionId, b.sessionId);
});

test('an unsigned session id is refused — no silent downgrade', async () => {
	const { sessionId } = await createAuthenticatedSession(SECRET);
	assert.equal(await readAuthenticatedSessionId(SECRET, `${AUTH_COOKIE_NAME}=${sessionId}`), null);
});

test('a tampered signature is refused', async () => {
	const { cookieValue } = await createAuthenticatedSession(SECRET);
	const tampered = `${cookieValue.slice(0, -1)}${cookieValue.endsWith('A') ? 'B' : 'A'}`;
	assert.equal(await readAuthenticatedSessionId(SECRET, `${AUTH_COOKIE_NAME}=${tampered}`), null);
});

test('a signature made with a different secret is refused', async () => {
	const { sessionId } = await createAuthenticatedSession(SECRET);
	const forged = await signSessionId('attacker-secret', sessionId);
	assert.equal(await readAuthenticatedSessionId(SECRET, `${AUTH_COOKIE_NAME}=${forged}`), null);
});

test('a swapped session id under a valid-looking signature is refused', async () => {
	const victim = await createAuthenticatedSession(SECRET);
	const attacker = await createAuthenticatedSession(SECRET);
	// Attacker keeps their own signature but substitutes the victim's id.
	const swapped = `${victim.sessionId}.${attacker.cookieValue.split('.')[1]}`;
	assert.equal(await readAuthenticatedSessionId(SECRET, `${AUTH_COOKIE_NAME}=${swapped}`), null);
});

test('malformed auth cookie shapes are refused', async () => {
	for (const bad of ['', '.', 'abc', `${'a'.repeat(64)}.`, `.${'a'.repeat(20)}`, "' OR 1=1 --"]) {
		assert.equal(
			await readAuthenticatedSessionId(SECRET, `${AUTH_COOKIE_NAME}=${bad}`),
			null,
			`accepted ${bad}`
		);
	}
});

test('the auth cookie is HttpOnly, Secure and SameSite', () => {
	const cookie = authSessionCookie('x.y', { secure: true, maxAgeSeconds: 100 });
	assert.match(cookie, /HttpOnly/);
	assert.match(cookie, /Secure/);
	assert.match(cookie, /SameSite=Lax/);
	assert.match(cookie, /Path=\//);
});

test('logout expires the auth cookie immediately', () => {
	assert.match(clearedAuthCookie({ secure: true }), /Max-Age=0/);
	assert.match(clearedAuthCookie({ secure: true }), /HttpOnly/);
});
