import { cookies } from "next/headers";

function secureCookiesEnabled() {
  return process.env.SECURE_COOKIES === "true";
}

export function sessionCookieName() {
  return secureCookiesEnabled()
    ? "__Host-migu_session"
    : "migu_session";
}

export function oauthStateCookieName() {
  return secureCookiesEnabled()
    ? "__Host-discord_oauth_state"
    : "discord_oauth_state";
}

function baseCookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: secureCookiesEnabled(),
    path: "/" as const,
    priority: "high" as const,
  };
}

export async function setSessionCookie(
  token: string,
  expires: Date,
) {
  const jar = await cookies();

  jar.set(sessionCookieName(), token, {
    ...baseCookieOptions(),
    expires,
  });
}

export async function readSessionCookie() {
  const jar = await cookies();
  return jar.get(sessionCookieName())?.value ?? null;
}

export async function clearSessionCookies() {
  const jar = await cookies();

  // Delete both names so moving between local and production settings cannot
  // leave an obsolete authentication cookie behind.
  jar.delete("migu_session");
  jar.delete("__Host-migu_session");
}

export async function setOAuthStateCookie(state: string) {
  const jar = await cookies();

  jar.set(oauthStateCookieName(), state, {
    ...baseCookieOptions(),
    maxAge: 600,
  });
}

export async function consumeOAuthStateCookie() {
  const jar = await cookies();
  const name = oauthStateCookieName();
  const state = jar.get(name)?.value ?? null;

  jar.delete(name);

  // Also remove the alternative development/production name during a
  // deployment transition.
  if (name === "__Host-discord_oauth_state") {
    jar.delete("discord_oauth_state");
  } else {
    jar.delete("__Host-discord_oauth_state");
  }

  return state;
}
