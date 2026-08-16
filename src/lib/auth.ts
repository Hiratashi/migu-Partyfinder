import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query } from "./db";
import { randomToken, sessionDigest } from "./crypto";

export type AppUser = {
  id:string;
  discord_id:string;
  username:string;
  display_name:string|null;
  avatar_url:string|null;
  timezone:string;
  is_admin:boolean;
  access_disabled:boolean;
  last_login_at:Date|null;
};

const SESSION_COOKIE="migu_session";

export async function createSession(userId:string) {
  const token=randomToken();
  const expires=new Date(Date.now()+7*24*60*60*1000);

  await query(
    "INSERT INTO sessions(user_id,token_hash,expires_at) VALUES($1,$2,$3)",
    [userId,sessionDigest(token),expires],
  );

  const jar=await cookies();

  jar.set(SESSION_COOKIE,token,{
    httpOnly:true,
    sameSite:"lax",
    secure:process.env.SECURE_COOKIES==="true",
    path:"/",
    expires,
  });
}

export async function destroySession() {
  const jar=await cookies();
  const token=jar.get(SESSION_COOKIE)?.value;

  if(token) {
    await query(
      "DELETE FROM sessions WHERE token_hash=$1",
      [sessionDigest(token)],
    );
  }

  jar.delete(SESSION_COOKIE);
}

export async function currentUser():Promise<AppUser|null> {
  const token=(await cookies()).get(SESSION_COOKIE)?.value;
  if(!token)return null;

  const result=await query<AppUser>(`
    SELECT
      u.id,
      u.discord_id,
      u.username,
      u.display_name,
      u.avatar_url,
      u.timezone,
      u.is_admin,
      u.access_disabled,
      u.last_login_at
    FROM sessions s
    JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=$1
      AND s.expires_at>now()
      AND u.access_disabled=false
    LIMIT 1
  `,[sessionDigest(token)]);

  return result.rows[0]??null;
}

export async function requireUser() {
  const user=await currentUser();
  if(!user)redirect("/login");
  return user;
}
