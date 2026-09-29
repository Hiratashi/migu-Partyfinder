import pg from 'pg';
import {createHash} from 'node:crypto';
import {runDiscordPresence} from './discord-presence.mjs';
import {queuePartyReminders} from './party-reminders.mjs';

const {Pool}=pg;
const pool=new Pool({connectionString:process.env.DATABASE_URL,max:2});
const token=process.env.DISCORD_BOT_TOKEN;
const guild=process.env.DISCORD_GUILD_ID;
const origin=process.env.APP_URL?.replace(/\/$/,'');
if(!token||!guild||!origin||!/^https?:\/\//.test(origin)) {
  throw new Error('DISCORD_BOT_TOKEN, DISCORD_GUILD_ID and APP_URL are required');
}

const api='https://discord.com/api/v10';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const presenceAbort=new AbortController();
void runDiscordPresence(token,presenceAbort.signal).catch(error=>
  console.error('Discord presence stopped',error.message));
const nonce=id=>createHash('sha256').update(id).digest('hex').slice(0,24);

async function discord(path,options={}) {
  const response=await fetch(`${api}${path}`,{
    ...options,
    headers:{authorization:`Bot ${token}`,'content-type':'application/json'},
    signal:AbortSignal.timeout(15000),
  });
  if(!response.ok) {
    const info=await response.json().catch(()=>({}));
    const error=new Error(`Discord API returned ${response.status}`);
    error.status=response.status;
    // Discord's numeric code is safe to record; never log the response body.
    error.apiCode=Number(info.code)||null;
    error.retryAfter=Number(info.retry_after)||0;
    throw error;
  }
  return response.json();
}

async function claim() {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const result=await client.query(`
      SELECT o.notification_id,n.user_id,n.kind,n.title,n.body,n.party_id,
             n.change_details,n.read_at,u.discord_id,u.access_disabled,
             u.discord_guild_alerts_enabled,u.discord_notifications_enabled,
             p.start_time,p.title AS party_title,r.name AS raid_name,o.attempts,
             o.fallback_required
      FROM discord_notification_outbox o
      JOIN notifications n ON n.id=o.notification_id
      JOIN users u ON u.id=n.user_id
      LEFT JOIN parties p ON p.id=n.party_id
      LEFT JOIN raids r ON r.id=p.raid_id
      WHERE o.delivered_at IS NULL AND o.stopped_at IS NULL
        AND o.next_attempt_at<=now()
        AND (o.leased_until IS NULL OR o.leased_until<now())
      ORDER BY o.next_attempt_at
      LIMIT 1 FOR UPDATE OF o SKIP LOCKED
    `);
    if(!result.rowCount) {
      await client.query('COMMIT');
      return null;
    }
    const row=result.rows[0];
    await client.query(`
      UPDATE discord_notification_outbox
      SET leased_until=now()+interval '90 seconds',attempts=attempts+1
      WHERE notification_id=$1
    `,[row.notification_id]);
    await client.query('COMMIT');
    return row;
  } catch(error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function timestamp(value) {
  const seconds=Math.floor(new Date(value).getTime()/1000);
  return Number.isFinite(seconds)?`<t:${seconds}:F>`:String(value);
}

function message(row,maxLength=2000) {
  const changes=Array.isArray(row.change_details)
    ? row.change_details.filter(item=>row.kind!=='PARTY_CHANGED'||item.format==='datetime').map(item=>
      `${item.label}: ${item.format==='datetime'?timestamp(item.before):item.before} → ${item.format==='datetime'?timestamp(item.after):item.after}`,
    ).join('\n') : '';
  const time=row.start_time && !row.change_details?.some(item=>item.label==='Start time')
    ? `\nParty time: ${timestamp(row.start_time)}` : '';
  const party=row.raid_name
    ? `\nParty: ${row.party_title||row.raid_name}${row.party_title?` (${row.raid_name})`:''}` : '';
  const link=row.party_id?`\n${origin}/parties/${row.party_id}`:`\n${origin}/notifications`;
  const prefix=`**${row.title}**\n${row.body}${party}${changes?`\n${changes}`:''}${time}`;
  return `${prefix.slice(0,maxLength-link.length)}${link}`;
}

async function finish(row,{messageId=null,stop=false,error=null,delay=0,method=null}={}) {
  await pool.query(`
    UPDATE discord_notification_outbox
    SET delivered_at=CASE WHEN $2::text IS NOT NULL THEN now() ELSE delivered_at END,
        discord_message_id=$2,stopped_at=CASE WHEN $3 THEN now() ELSE stopped_at END,
        last_error=$4,leased_until=NULL,
        next_attempt_at=now()+($5::int*interval '1 second'),
        delivery_method=COALESCE($6,delivery_method)
    WHERE notification_id=$1
  `,[row.notification_id,messageId,stop,error,delay,method]);
  if(stop)console.warn('Discord delivery stopped',row.notification_id,row.kind,error);
}

async function guildFallback(row,dmCode=null) {
  const channel=process.env.DISCORD_ALERT_CHANNEL_ID;
  if(!row.discord_guild_alerts_enabled || !channel) {
    await finish(row,{stop:true,error:dmCode
      ? `DM unavailable (Discord ${dmCode}); website inbox only`
      : 'Guild fallback unavailable; website inbox only'});
    return;
  }
  try {
    const sent=await discord(`/channels/${channel}/messages`,{
      method:'POST',body:JSON.stringify({
        content:`<@${row.discord_id}> ${message(row,2000-row.discord_id.length-4)}`,
        allowed_mentions:{users:[row.discord_id]},
        nonce:nonce(row.notification_id),enforce_nonce:true,
      }),
    });
    await finish(row,{messageId:sent.id,method:'GUILD',
      error:dmCode?`DM unavailable (Discord ${dmCode}); guild mention delivered`:null});
  } catch(error) {
    const label=`guild fallback: HTTP ${error.status??'network'}${error.apiCode?` / Discord ${error.apiCode}`:''}`;
    const delay=error.status===429
      ? Math.min(3600,Math.max(2,Math.ceil(error.retryAfter)))
      : Math.min(3600,Math.pow(2,Math.min(row.attempts,10))*5);
    await finish(row,{error:label,delay});
    console.error('Discord guild fallback retry scheduled',row.notification_id,label);
  }
}

// Claim matching guild recipients together. A personal DM never enters this batch.
async function claimReminderPeers(row) {
  const result=await pool.query(`
    WITH peers AS (
      SELECT o.notification_id
      FROM discord_notification_outbox o
      JOIN notifications n ON n.id=o.notification_id
      JOIN users u ON u.id=n.user_id
      JOIN party_reminder_deliveries d ON d.party_id=n.party_id
        AND d.user_id=n.user_id AND d.kind='PARTY_REMINDER'
      JOIN parties p ON p.id=n.party_id AND p.start_time=d.start_time
      JOIN party_reminder_deliveries anchor ON anchor.party_id=d.party_id
        AND anchor.user_id=$2 AND anchor.start_time=d.start_time
        AND anchor.kind=d.kind
      WHERE n.party_id=$1 AND n.kind='PARTY_REMINDER'
        AND u.id<>$2 AND u.discord_notifications_enabled
        AND u.discord_guild_alerts_enabled AND NOT u.access_disabled
        AND u.party_reminder_minutes=(SELECT party_reminder_minutes FROM users WHERE id=$2)
        AND o.delivered_at IS NULL AND o.stopped_at IS NULL
        AND o.next_attempt_at<=now()
        AND (o.leased_until IS NULL OR o.leased_until<now())
      ORDER BY o.next_attempt_at LIMIT 19 FOR UPDATE OF o SKIP LOCKED
    ), leased AS (
      UPDATE discord_notification_outbox o
      SET leased_until=now()+interval '90 seconds',attempts=attempts+1
      FROM peers WHERE o.notification_id=peers.notification_id
      RETURNING o.notification_id,o.attempts
    )
    SELECT l.notification_id,l.attempts,n.user_id,n.kind,n.title,n.body,n.party_id,
           p.start_time,p.title AS party_title,r.name AS raid_name,u.discord_id
    FROM leased l JOIN notifications n ON n.id=l.notification_id
    JOIN users u ON u.id=n.user_id
    JOIN parties p ON p.id=n.party_id JOIN raids r ON r.id=p.raid_id
  `,[row.party_id,row.user_id]);
  return result.rows;
}

async function guildReminderBatch(row) {
  const channel=process.env.DISCORD_ALERT_CHANNEL_ID;
  if(!channel) {
    await guildFallback(row);
    return;
  }
  const peers=await claimReminderPeers(row);
  const ready=[row];
  for(const peer of peers) {
    try {
      const member=await discord(`/guilds/${guild}/members/${peer.discord_id}`);
      const role=process.env.DISCORD_REQUIRED_ROLE_ID;
      if(role&&!member.roles?.includes(role)) {
        await finish(peer,{stop:true,error:'Required guild role absent'});
      } else ready.push(peer);
    } catch(error) {
      if(error.status===404)await finish(peer,{stop:true,error:'Recipient no longer in guild'});
      else await finish(peer,{error:'Guild membership check failed',delay:3600});
    }
  }
  const mentions=ready.map(item=>`<@${item.discord_id}>`).join(' ');
  const ids=ready.map(item=>item.discord_id);
  const key=ready.map(item=>item.notification_id).sort().join(':');
  async function finishGroup({messageId=null,error=null,delay=0}={}) {
    await pool.query(`
      UPDATE discord_notification_outbox
      SET delivered_at=CASE WHEN $2::text IS NOT NULL THEN now() ELSE delivered_at END,
          discord_message_id=$2,last_error=$3,leased_until=NULL,
          next_attempt_at=now()+($4::int*interval '1 second'),
          delivery_method=CASE WHEN $2::text IS NOT NULL THEN 'GUILD' ELSE delivery_method END
      WHERE notification_id=ANY($1::uuid[])
    `,[ready.map(item=>item.notification_id),messageId,error,delay]);
  }
  try {
    const sent=await discord(`/channels/${channel}/messages`,{
      method:'POST',body:JSON.stringify({
        content:`${mentions} ${message(row,2000-mentions.length-1)}`,
        allowed_mentions:{parse:[],users:ids},
        nonce:nonce(key),enforce_nonce:true,
      }),
    });
    await finishGroup({messageId:sent.id});
  } catch(error) {
    const delay=error.status===429
      ?Math.min(3600,Math.max(2,Math.ceil(error.retryAfter)))
      :Math.min(3600,Math.pow(2,Math.min(row.attempts,10))*5);
    await finishGroup({error:'Guild reminder delivery failed',delay});
  }
}

async function deliver(row) {
  if(row.kind==='PARTY_GROUP_CHANGED') {
    await finish(row,{stop:true,error:'Striker assignment shown in website inbox only'});
    return;
  }
  // A resolved invitation/change or a suspended account needs no Discord alert.
  if(!row.discord_notifications_enabled) {
    await finish(row,{stop:true,error:'Discord notifications disabled by recipient'});
    return;
  }
  if(row.access_disabled ||
    (row.read_at && ['PARTY_INVITATION','PARTY_CHANGED'].includes(row.kind))) {
    await finish(row,{stop:true,error:'No longer actionable'});
    return;
  }
  let phase='guild membership';
  try {
    let member;
    try {
      member=await discord(`/guilds/${guild}/members/${row.discord_id}`);
    } catch(error) {
      if(error.status===404) {
        await finish(row,{stop:true,error:'Recipient no longer in guild'});
        return;
      }
      // A 403 here indicates bot/guild configuration, not a blocked DM.
      if(error.status===403) {
        await finish(row,{error:'Bot cannot check guild membership',delay:3600});
        return;
      }
      throw error;
    }
    const requiredRole=process.env.DISCORD_REQUIRED_ROLE_ID;
    if(requiredRole && !member.roles?.includes(requiredRole)) {
      await finish(row,{stop:true,error:'Required guild role absent'});
      return;
    }
    if(row.discord_guild_alerts_enabled) {
      if(row.kind==='PARTY_REMINDER')await guildReminderBatch(row);
      else await guildFallback(row);
      return;
    }
    phase='open DM';
    const dm=await discord('/users/@me/channels',{
      method:'POST',body:JSON.stringify({recipient_id:row.discord_id}),
    });
    phase='send DM';
    const sent=await discord(`/channels/${dm.id}/messages`,{
      method:'POST',body:JSON.stringify({
        content:message(row),allowed_mentions:{parse:[]},
        nonce:nonce(row.notification_id),enforce_nonce:true,
      }),
    });
    await finish(row,{messageId:sent.id,method:'DM'});
  } catch(error) {
    const label=`${phase}: HTTP ${error.status??'network'}${error.apiCode?` / Discord ${error.apiCode}`:''}`;
    if([50007,50278].includes(error.apiCode)) {
      await finish(row,{stop:true,
        error:`DM unavailable (Discord ${error.apiCode}); website inbox only`});
    } else if(error.status===403 || error.status===404) {
      // A different 403/404 might be bot configuration rather than a user
      // preference. Preserve the alert so a corrected setup can retry it.
      await finish(row,{error:label,delay:3600});
      console.error('Discord delivery retry scheduled',row.notification_id,label);
    } else {
      const backoff=error.status===429
        ? Math.min(3600,Math.max(2,Math.ceil(error.retryAfter)))
        : Math.min(3600,Math.pow(2,Math.min(row.attempts,10))*5);
      await finish(row,{error:label,delay:backoff});
      console.error('Discord delivery retry scheduled',row.notification_id,label);
    }
  }
}

async function announceOne() {
  const channel=process.env.DISCORD_ANNOUNCEMENT_CHANNEL_ID;
  if(!channel)return false;
  const client=await pool.connect();
  let row;
  try {
    await client.query('BEGIN');
    const result=await client.query(`
      SELECT a.party_id,a.attempts,a.revision,a.discord_message_id,
             p.start_time,p.status,p.discord_announce,p.discord_ping_roles,
             p.need_dps,p.need_support,p.title,r.name AS raid_name,r.party_size,
             r.discord_dps_role_id,r.discord_support_role_id
      FROM discord_party_announcements a
      JOIN parties p ON p.id=a.party_id
      JOIN raids r ON r.id=p.raid_id
      WHERE a.delivered_at IS NULL AND a.stopped_at IS NULL
        AND a.next_attempt_at<=now()
        AND (a.leased_until IS NULL OR a.leased_until<now())
      ORDER BY a.next_attempt_at LIMIT 1 FOR UPDATE OF a SKIP LOCKED
    `);
    row=result.rows[0];
    if(row)await client.query(`
      UPDATE discord_party_announcements
      SET leased_until=now()+interval '90 seconds',attempts=attempts+1
      WHERE party_id=$1
    `,[row.party_id]);
    await client.query('COMMIT');
  } catch(error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  if(!row)return false;
  async function update({messageId=null,stop=false,error=null,delay=0}={}) {
    await pool.query(`
      UPDATE discord_party_announcements
      SET delivered_at=CASE WHEN $2::text IS NOT NULL THEN now() ELSE delivered_at END,
          discord_message_id=COALESCE($2,discord_message_id),
          stopped_at=CASE WHEN $3 THEN now() ELSE stopped_at END,
          last_error=$4,leased_until=NULL,
          next_attempt_at=now()+($5::int*interval '1 second')
      WHERE party_id=$1 AND revision=$6
    `,[row.party_id,messageId,stop,error,delay,row.revision]);
  }
  if(!row.discord_announce || (!row.discord_message_id &&
    (!['OPEN','FULL'].includes(row.status) || new Date(row.start_time)<=new Date()))) {
    await update({stop:true,error:'Party no longer available'});
    return true;
  }
  try {
    const name=(row.title||row.raid_name).replace(/[@`*_~|>]/g,'').slice(0,100);
    const roster=await pool.query(`
      SELECT COALESCE(u.display_name,u.username) AS player,
             ch.character_name,c.name AS class_name,c.role
      FROM party_members pm
      JOIN users u ON u.id=pm.user_id
      LEFT JOIN characters ch ON ch.id=pm.character_id
      LEFT JOIN classes c ON c.id=ch.class_id
      WHERE pm.party_id=$1 AND pm.status='ACCEPTED'
      ORDER BY pm.joined_at
    `,[row.party_id]);
    const filled=roster.rows.length;
    const dps=roster.rows.filter(member=>member.role==='DPS').length;
    const support=roster.rows.filter(member=>member.role==='SUPPORT').length;
    const missingDps=Math.max(0,row.need_dps-dps);
    const missingSupport=Math.max(0,row.need_support-support);
    const wanted=[missingDps?`${missingDps} DPS`:null,missingSupport?`${missingSupport} support`:null].filter(Boolean).join(', ');
    const closed=!['OPEN','FULL'].includes(row.status);
    const members=roster.rows.map(member=>
      `${member.player}: ${member.character_name?`${member.character_name} (${member.class_name})`:'character pending'}`,
    ).join(', ');
    const link=`\n${origin}/parties/${row.party_id}`;
    const summary=closed?`Party closed (${row.status.toLowerCase()}).`
      :`${filled}/${row.party_size} filled.${wanted?` Looking for ${wanted}.`:''}${filled>=row.party_size?' Party full.':''}`;
    const prefix=`${row.discord_message_id?'Party update':'New party'}: **${name}**\n${row.raid_name} · ${timestamp(row.start_time)}\n${summary}\nRoster: ${members||'none yet'}`;
    // Role pings happen only on the initial post. Updates never re-ping roles.
    const roles=!row.discord_message_id&&row.discord_ping_roles&&!closed
      ?[missingDps?row.discord_dps_role_id:null,missingSupport?row.discord_support_role_id:null].filter(Boolean):[];
    const mention=roles.map(id=>`<@&${id}>`).join(' ');
    const content=`${mention?`${mention}\n`:''}${prefix}`.slice(0,2000-link.length)+link;
    const sent=await discord(`/channels/${channel}/messages${row.discord_message_id?`/${row.discord_message_id}`:''}`,{
      method:row.discord_message_id?'PATCH':'POST',body:JSON.stringify({
        content,
        allowed_mentions:{parse:[],roles},
        ...(!row.discord_message_id?{nonce:nonce(row.party_id),enforce_nonce:true}:{}),
      }),
    });
    await pool.query(`
      UPDATE discord_party_announcements
      SET discord_message_id=COALESCE(discord_message_id,$2),
          delivered_at=CASE WHEN revision=$3 THEN now() ELSE NULL END,
          leased_until=NULL,last_error=NULL
      WHERE party_id=$1
    `,[row.party_id,sent.id,row.revision]);
  } catch(error) {
    if([403,404].includes(error.status)) {
      // Configuration can be fixed without losing the queued event.
      await update({error:'Announcement channel inaccessible',delay:3600});
    } else {
      const delay=error.status===429
        ? Math.max(2,Math.ceil(error.retryAfter))
        : Math.min(3600,Math.pow(2,Math.min(row.attempts,10))*5);
      await update({error:String(error.message).slice(0,200),delay});
    }
    console.error('Discord announcement retry scheduled',row.party_id,error.message);
  }
  return true;
}

let running=true;
let nextReminderCheck=0;
process.on('SIGTERM',()=>{running=false;presenceAbort.abort();});
process.on('SIGINT',()=>{running=false;presenceAbort.abort();});
while(running) {
  try {
    if(Date.now()>=nextReminderCheck) {
      await queuePartyReminders(pool);
      nextReminderCheck=Date.now()+30000;
    }
    const row=await claim();
    if(row)await deliver(row);
    const announced=await announceOne();
    if(!row&&!announced)await pause(3000);
  } catch(error) {
    console.error('Discord worker error',error);
    await pause(5000);
  }
}
await pool.end();
