import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCode, getDiscordGuilds, getDiscordUser, userHasRequiredRole } from "@/lib/discord";
import { query } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { timingSafeEqual } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get("discord_oauth_state")?.value;
  jar.delete("discord_oauth_state");
  if (!code || !state || !expected || !timingSafeEqual(state, expected)) return NextResponse.redirect(`${process.env.APP_URL}/login?error=oauth_state`);

  try {
    const { access_token } = await exchangeCode(code);
    const [du, guilds] = await Promise.all([getDiscordUser(access_token), getDiscordGuilds(access_token)]);
    const guildId = process.env.DISCORD_GUILD_ID!;
    if (!guilds.some(g => g.id === guildId)) return NextResponse.redirect(`${process.env.APP_URL}/login?error=not_guild_member`);
    const requiredRole = process.env.DISCORD_REQUIRED_ROLE_ID?.trim();
    if (requiredRole && !(await userHasRequiredRole(access_token, guildId, requiredRole))) return NextResponse.redirect(`${process.env.APP_URL}/login?error=missing_role`);

    const avatar = du.avatar ? `https://cdn.discordapp.com/avatars/${du.id}/${du.avatar}.png?size=128` : null;
    const r = await query<{id:string}>(`INSERT INTO users(discord_id,username,display_name,avatar_url)
      VALUES($1,$2,$3,$4)
      ON CONFLICT(discord_id) DO UPDATE SET username=EXCLUDED.username,display_name=EXCLUDED.display_name,avatar_url=EXCLUDED.avatar_url,updated_at=now()
      RETURNING id`, [du.id, du.username, du.global_name ?? null, avatar]);
    await createSession(r.rows[0].id);
    return NextResponse.redirect(`${process.env.APP_URL}/`);
  } catch (e) {
    console.error(e);
    return NextResponse.redirect(`${process.env.APP_URL}/login?error=discord`);
  }
}
