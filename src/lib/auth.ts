import { redirect } from "next/navigation";
import { query } from "./db";
import { randomToken, sessionDigest } from "./crypto";
import {
  clearSessionCookies,
  readSessionCookie,
  setSessionCookie,
} from "./cookie-config";

export type AppUser = {
  id: string;
  discord_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string;
  is_admin: boolean;
};

export async function createSession(userId: string) {
  const token = randomToken();
  const expires = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  );

  // Keep the session table tidy without invalidating legitimate sessions on
  // another device.
  await query(
    "DELETE FROM sessions WHERE user_id=$1 AND expires_at <= now()",
    [userId],
  );

  await query(
    "INSERT INTO sessions(user_id,token_hash,expires_at) VALUES($1,$2,$3)",
    [userId, sessionDigest(token), expires],
  );

  await setSessionCookie(token, expires);
}

export async function destroySession() {
  const token = await readSessionCookie();

  if (token) {
    await query(
      "DELETE FROM sessions WHERE token_hash=$1",
      [sessionDigest(token)],
    );
  }

  await clearSessionCookies();
}

export async function currentUser(): Promise<AppUser | null> {
  const token = await readSessionCookie();
  if (!token) return null;

  const result = await query<AppUser>(
    `SELECT
       u.id,
       u.discord_id,
       u.username,
       u.display_name,
       u.avatar_url,
       u.timezone,
       u.is_admin
     FROM sessions s
     JOIN users u ON u.id=s.user_id
     WHERE s.token_hash=$1
       AND s.expires_at > now()
       AND u.access_disabled=false
     LIMIT 1`,
    [sessionDigest(token)],
  );

  return result.rows[0] ?? null;
}

export async function requireUser() {
  const user = await currentUser();

  if (!user) redirect("/login");

  return user;
}
