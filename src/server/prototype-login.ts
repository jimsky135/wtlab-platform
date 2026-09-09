// Prototype login bridge.
//
// ⚠️ PROTOTYPE ONLY. This is not an account system and must never be
// described as one. It exists to answer exactly one question: can an
// identity layer sit on top of the guest workspace that already works?
// There is no user table, no registration, no password reset, no roles.
// One credential, supplied by server configuration, gates one thing —
// whether the server issues an authenticated session.
//
// Two rules carry the whole security posture:
//
// 1. An authenticated session lives in its OWN cookie whose value is
//    SIGNED with a server secret. Stripping the signature does not
//    degrade into the anonymous cookie, because the two are different
//    cookie names holding different ids — so a client cannot hand itself
//    an authenticated workspace, and cannot resurrect one after logout.
//
// 2. Logging in always MINTS A NEW session id and ignores whatever the
//    request arrived with. That is what makes session fixation useless:
//    an attacker cannot pre-plant an id and wait for someone to
//    authenticate it.

import { createGuestSessionId, isGuestSessionId } from './guest-session.ts';

/** Separate from the anonymous cookie on purpose — see rule 1 above. */
export const AUTH_COOKIE_NAME = 'wtlab_auth';

/**
 * Credentials and signing key. Supplied by server configuration
 * (`.dev.vars` locally, Worker secrets remotely) — never compiled in, so
 * no credential value lives in the repository.
 */
export interface PrototypeLoginConfig {
	username: string;
	/** Lowercase hex SHA-256 of the password. The password itself is never stored. */
	passwordSha256: string;
	/** HMAC key for session signatures. */
	sessionSecret: string;
}

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
	return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');
}

function toBase64Url(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Length-independent comparison, so a mismatch reveals nothing through timing. */
function constantTimeEquals(a: string, b: string): boolean {
	const left = encoder.encode(a);
	const right = encoder.encode(b);
	// Compare a fixed-size digest of each side so differing lengths cannot
	// short-circuit the loop.
	const length = Math.max(left.length, right.length);
	let difference = left.length ^ right.length;
	for (let i = 0; i < length; i += 1) {
		difference |= (left[i] ?? 0) ^ (right[i] ?? 0);
	}
	return difference === 0;
}

export async function sha256Hex(value: string): Promise<string> {
	return toHex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

/**
 * The only credential check. Both username and password must match; the
 * password is compared as a hash, so the plain value is never held.
 */
export async function verifyPrototypeCredentials(
	config: PrototypeLoginConfig,
	username: unknown,
	password: unknown
): Promise<boolean> {
	if (typeof username !== 'string' || typeof password !== 'string') return false;
	if (username === '' || password === '') return false;

	const usernameOk = constantTimeEquals(username, config.username);
	const passwordOk = constantTimeEquals(await sha256Hex(password), config.passwordSha256);
	// Both are evaluated regardless of the first result — no early return.
	return usernameOk && passwordOk;
}

async function hmac(secret: string, message: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	return toBase64Url(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
}

/** `<sessionId>.<signature>` — the only form the server will accept back. */
export async function signSessionId(secret: string, sessionId: string): Promise<string> {
	return `${sessionId}.${await hmac(secret, sessionId)}`;
}

/**
 * Mints a brand-new authenticated session. Never derives the id from the
 * incoming request, which is precisely what defeats session fixation.
 */
export async function createAuthenticatedSession(secret: string): Promise<{ sessionId: string; cookieValue: string }> {
	const sessionId = createGuestSessionId();
	return { sessionId, cookieValue: await signSessionId(secret, sessionId) };
}

/**
 * Returns the authenticated session id only when the cookie carries a
 * signature this server produced. A tampered, truncated, or unsigned
 * value yields null — it is never treated as a weaker identity.
 */
export async function readAuthenticatedSessionId(
	secret: string,
	cookieHeader: string | null | undefined
): Promise<string | null> {
	if (!cookieHeader) return null;

	for (const part of cookieHeader.split(';')) {
		const separator = part.indexOf('=');
		if (separator === -1) continue;
		if (part.slice(0, separator).trim() !== AUTH_COOKIE_NAME) continue;

		const value = part.slice(separator + 1).trim();
		const dot = value.indexOf('.');
		if (dot === -1) return null;

		const sessionId = value.slice(0, dot);
		const signature = value.slice(dot + 1);
		if (!isGuestSessionId(sessionId) || signature === '') return null;

		const expected = await hmac(secret, sessionId);
		return constantTimeEquals(signature, expected) ? sessionId : null;
	}

	return null;
}

function cookieAttributes(name: string, value: string, maxAge: number, secure: boolean): string {
	const attributes = [`${name}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAge}`];
	if (secure) attributes.push('Secure');
	return attributes.join('; ');
}

export function authSessionCookie(
	cookieValue: string,
	options: { secure: boolean; maxAgeSeconds: number }
): string {
	return cookieAttributes(AUTH_COOKIE_NAME, cookieValue, options.maxAgeSeconds, options.secure);
}

export function clearedAuthCookie(options: { secure: boolean }): string {
	return cookieAttributes(AUTH_COOKIE_NAME, '', 0, options.secure);
}
