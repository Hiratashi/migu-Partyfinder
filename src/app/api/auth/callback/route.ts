import { NextRequest, NextResponse } from "next/server";
import {
  getDiscordGuilds,
  getDiscordUser,
  userHasRequiredRole,
} from "@/lib/discord";
import { exchangeDiscordCodeWithRefresh } from "@/lib/discord-oauth";
import { storeDiscordOAuthTokens } from "@/lib/discord-token-store";
import { query } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { timingSafeEqual } from "@/lib/crypto";
import { writeAudit } from "@/lib/audit";
import { limitAuthCallback } from "@/lib/rate-limit";
import { consumeOAuthStateCookie } from "@/lib/cookie-config";

export async function GET(req:NextRequest) {
  const limited=limitAuthCallback(req);
  if(limited)return limited;
  const url=new URL(req.url);
  const code=url.searchParams.get("code");
  const state=url.searchParams.get("state");

  const expected=await consumeOAuthStateCookie();

  if(
    !code||
    !state||
    !expected||
    !timingSafeEqual(state,expected)
  ) {
    return NextResponse.redirect(
      `${process.env.APP_URL}/login?error=oauth_state`,
    );
  }

  try {
    const token=await exchangeDiscordCodeWithRefresh(code);
    const accessToken=token.access_token;

    const [du,guilds]=await Promise.all([
      getDiscordUser(accessToken),
      getDiscordGuilds(accessToken),
    ]);

    const guildId=process.env.DISCORD_GUILD_ID!;

    if(!guilds.some(g=>g.id===guildId)) {
      return NextResponse.redirect(
        `${process.env.APP_URL}/login?error=not_guild_member`,
      );
    }

    const requiredRole=
      process.env.DISCORD_REQUIRED_ROLE_ID?.trim();

    if(
      requiredRole&&
      !(await userHasRequiredRole(
        accessToken,
        guildId,
        requiredRole,
      ))
    ) {
      return NextResponse.redirect(
        `${process.env.APP_URL}/login?error=missing_role`,
      );
    }

    const avatar=du.avatar
      ? `https://cdn.discordapp.com/avatars/${du.id}/${du.avatar}.png?size=128`
      : null;

    const r=await query<{
      id:string;
      access_disabled:boolean;
      access_disabled_reason:string|null;
    }>(`
      INSERT INTO users(
        discord_id,
        username,
        display_name,
        avatar_url,
        guild_membership_checked_at
      )
      VALUES($1,$2,$3,$4,now())
      ON CONFLICT(discord_id)
      DO UPDATE SET
        username=EXCLUDED.username,
        display_name=EXCLUDED.display_name,
        avatar_url=EXCLUDED.avatar_url,
        guild_membership_checked_at=now(),
        updated_at=now()
      RETURNING
        id,
        access_disabled,
        access_disabled_reason
    `,[
      du.id,
      du.username,
      du.global_name??null,
      avatar,
    ]);

    const user=r.rows[0];

    // A guild-leave suspension is automatically reversible when the user
    // later proves membership again through Discord OAuth.
    if(
      user.access_disabled&&
      user.access_disabled_reason==="LEFT_GUILD"
    ) {
      await query(`
        UPDATE users
        SET
          access_disabled=false,
          access_disabled_reason=NULL,
          updated_at=now()
        WHERE id=$1
      `,[user.id]);
      await writeAudit({
        userId:user.id,
        action:"USER_AUTO_RESTORE_GUILD_REJOIN",
        entityType:"user",
        entityId:user.id,
        metadata:{
          reason:"Discord guild membership verified again",
        },
      });
    } else if(user.access_disabled) {
      return NextResponse.redirect(
        `${process.env.APP_URL}/login?error=access_disabled`,
      );
    }

    await storeDiscordOAuthTokens(user.id,token);

    await query(
      `UPDATE users
       SET
         last_login_at=now(),
         guild_membership_checked_at=now(),
         updated_at=now()
       WHERE id=$1`,
      [user.id],
    );

    await createSession(user.id);

    return NextResponse.redirect(`${process.env.APP_URL}/`);
  } catch(e) {
    console.error(e);
    return NextResponse.redirect(
      `${process.env.APP_URL}/login?error=discord`,
    );
  }
}
