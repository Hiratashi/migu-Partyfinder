import { db, query } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import {
  getStoredDiscordTokens,
  refreshDiscordOAuthToken,
} from "@/lib/discord-token-store";

type Guild={
  id:string;
};

const CHECK_INTERVAL_MS=60*60*1000;

async function currentGuildIds(accessToken:string) {
  const ids=new Set<string>();
  let after:string|undefined;

  // Discord allows pagination. Five pages is far beyond what a normal
  // Partyfinder user should need, but avoids assuming the target guild is
  // on the first page.
  for(let page=0;page<5;page++) {
    const url=new URL("https://discord.com/api/users/@me/guilds");
    url.searchParams.set("limit","200");
    if(after)url.searchParams.set("after",after);

    const r=await fetch(url,{
      headers:{
        authorization:`Bearer ${accessToken}`,
      },
      cache:"no-store",
    });

    if(r.status===401)return {kind:"unauthorized" as const};

    if(!r.ok) {
      throw new Error(`Discord guild check failed: ${r.status}`);
    }

    const guilds=await r.json() as Guild[];

    for(const guild of guilds)ids.add(guild.id);

    if(guilds.length<200)break;
    after=guilds[guilds.length-1]?.id;
    if(!after)break;
  }

  return {kind:"ok" as const,ids};
}

export function guildCheckDue(
  checkedAt:Date|null|undefined,
) {
  if(!checkedAt)return true;

  return Date.now()-new Date(checkedAt).getTime()>=CHECK_INTERVAL_MS;
}

export async function verifyUserGuildMembership(
  userId:string,
):Promise<
  "member"|"not_member"|"unavailable"|"reauth_required"
> {
  const guildId=process.env.DISCORD_GUILD_ID;
  if(!guildId)return "unavailable";

  const stored=await getStoredDiscordTokens(userId);

  // Users created before token persistence need one fresh OAuth login.
  if(!stored)return "reauth_required";

  let accessToken=stored.accessToken;

  try {
    if(stored.expiresAt.getTime()<=Date.now()+60_000) {
      const refreshed=await refreshDiscordOAuthToken(
        userId,
        stored.refreshToken,
      );
      accessToken=refreshed.access_token;
    }

    let result=await currentGuildIds(accessToken);

    if(result.kind==="unauthorized") {
      const refreshed=await refreshDiscordOAuthToken(
        userId,
        stored.refreshToken,
      );

      result=await currentGuildIds(refreshed.access_token);
    }

    if(result.kind!=="ok")return "reauth_required";

    return result.ids.has(guildId)
      ? "member"
      : "not_member";
  } catch(e) {
    console.error("Discord membership reconciliation failed",e);
    return "unavailable";
  }
}

export async function recordGuildCheck(userId:string) {
  await query(
    "UPDATE users SET guild_membership_checked_at=now() WHERE id=$1",
    [userId],
  );
}

export async function suspendUserForGuildDeparture(
  userId:string,
) {
  const client=await db.connect();

  try {
    await client.query("BEGIN");

    // Lock the account row so two simultaneous stale requests cannot run
    // the guild-departure cleanup at the same time.
    const user=await client.query<{
      access_disabled:boolean;
      access_disabled_reason:string|null;
    }>(`
      SELECT access_disabled,access_disabled_reason
      FROM users
      WHERE id=$1
      FOR UPDATE
    `,[userId]);

    if(!user.rowCount) {
      await client.query("ROLLBACK");
      return;
    }

    // A manual administrator disable must never be replaced by LEFT_GUILD.
    if(
      user.rows[0].access_disabled&&
      user.rows[0].access_disabled_reason==="ADMIN"
    ) {
      await client.query(
        "DELETE FROM sessions WHERE user_id=$1",
        [userId],
      );
      await client.query("COMMIT");
      return;
    }

    // Cancel future active parties owned by the departing guild member.
    const cancelled=await client.query<{id:string}>(`
      UPDATE parties
      SET
        status='CANCELLED',
        cancelled_at=COALESCE(cancelled_at,now()),
        updated_at=now()
      WHERE leader_id=$1
        AND status IN ('OPEN','FULL')
        AND start_time>now()
      RETURNING id
    `,[userId]);

    for(const party of cancelled.rows) {
      await writeAudit({
        userId,
        action:"PARTY_AUTO_CANCEL_GUILD_LEAVE",
        entityType:"party",
        entityId:party.id,
        metadata:{
          reason:"Leader left Discord guild",
        },
      },client);
    }

    // Remove accepted memberships from somebody else's future active party.
    // If a previously FULL party loses the accepted member, reopen it.
    const accepted=await client.query<{party_id:string}>(`
      DELETE FROM party_members pm
      USING parties p
      WHERE pm.party_id=p.id
        AND pm.user_id=$1
        AND pm.status='ACCEPTED'
        AND p.leader_id<>$1
        AND p.status IN ('OPEN','FULL')
        AND p.start_time>now()
      RETURNING pm.party_id
    `,[userId]);

    if(accepted.rowCount) {
      const partyIds=[...new Set(accepted.rows.map(r=>r.party_id))];

      await client.query(`
        UPDATE parties
        SET status='OPEN',updated_at=now()
        WHERE id=ANY($1::uuid[])
          AND status='FULL'
      `,[partyIds]);

      for(const partyId of partyIds) {
        await writeAudit({
          userId,
          action:"PARTY_MEMBER_AUTO_REMOVE_GUILD_LEAVE",
          entityType:"party",
          entityId:partyId,
          metadata:{
            removed_user_id:userId,
            reason:"Member left Discord guild",
          },
        },client);
      }
    }

    // Pending invitations no longer make sense once guild access is gone.
    await client.query(`
      DELETE FROM party_members pm
      USING parties p
      WHERE pm.party_id=p.id
        AND pm.user_id=$1
        AND pm.status='INVITED'
        AND p.leader_id<>$1
        AND p.status IN ('OPEN','FULL')
        AND p.start_time>now()
    `,[userId]);

    await client.query(`
      UPDATE users
      SET
        access_disabled=true,
        access_disabled_reason='LEFT_GUILD',
        guild_membership_checked_at=now(),
        updated_at=now()
      WHERE id=$1
    `,[userId]);

    await writeAudit({
      userId,
      action:"USER_AUTO_SUSPEND_GUILD_LEAVE",
      entityType:"user",
      entityId:userId,
      metadata:{
        reason:"User is no longer a member of the configured Discord guild",
        sessions_revoked:true,
        parties_cancelled:cancelled.rowCount??0,
        party_memberships_removed:accepted.rowCount??0,
      },
    },client);

    // Revocation is part of the same transaction as party cleanup.
    await client.query(
      "DELETE FROM sessions WHERE user_id=$1",
      [userId],
    );

    await client.query("COMMIT");
  } catch(e) {
    await client.query("ROLLBACK");
    console.error("Guild-departure party cleanup failed",e);
    throw e;
  } finally {
    client.release();
  }
}
