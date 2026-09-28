import pg from 'pg';
import {createHash} from 'node:crypto';

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
             p.start_time,o.attempts
      FROM discord_notification_outbox o
      JOIN notifications n ON n.id=o.notification_id
      JOIN users u ON u.id=n.user_id
      LEFT JOIN parties p ON p.id=n.party_id
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

function message(row) {
  const changes=Array.isArray(row.change_details)
    ? row.change_details.map(item=>
      `${item.label}: ${item.format==='datetime'?timestamp(item.before):item.before} → ${item.format==='datetime'?timestamp(item.after):item.after}`,
    ).join('\n') : '';
  const time=row.start_time && !row.change_details?.some(item=>item.label==='Start time')
    ? `\nParty time: ${timestamp(row.start_time)}` : '';
  const link=row.party_id?`\n${origin}/parties/${row.party_id}`:`\n${origin}/notifications`;
  return `**${row.title}**\n${row.body}${changes?`\n${changes}`:''}${time}${link}`.slice(0,2000);
}

async function finish(row,{messageId=null,stop=false,error=null,delay=0}={}) {
  await pool.query(`
    UPDATE discord_notification_outbox
    SET delivered_at=CASE WHEN $2::text IS NOT NULL THEN now() ELSE delivered_at END,
        discord_message_id=$2,stopped_at=CASE WHEN $3 THEN now() ELSE stopped_at END,
        last_error=$4,leased_until=NULL,
        next_attempt_at=now()+($5::int*interval '1 second')
    WHERE notification_id=$1
  `,[row.notification_id,messageId,stop,error,delay]);
  if(stop)console.warn('Discord delivery stopped',row.notification_id,row.kind,error);
}

async function deliver(row) {
  // A resolved invitation/change and a suspended account need no DM.
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
    await finish(row,{messageId:sent.id});
  } catch(error) {
    const label=`${phase}: HTTP ${error.status??'network'}${error.apiCode?` / Discord ${error.apiCode}`:''}`;
    if([50007,50278].includes(error.apiCode)) {
      await finish(row,{stop:true,error:`${label} (recipient cannot receive DM)`});
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
      SELECT a.party_id,a.attempts,p.start_time,p.status,r.name AS raid_name,
             p.title
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
          discord_message_id=$2,stopped_at=CASE WHEN $3 THEN now() ELSE stopped_at END,
          last_error=$4,leased_until=NULL,
          next_attempt_at=now()+($5::int*interval '1 second')
      WHERE party_id=$1
    `,[row.party_id,messageId,stop,error,delay]);
  }
  if(!['OPEN','FULL'].includes(row.status) || new Date(row.start_time)<=new Date()) {
    await update({stop:true,error:'Party no longer available'});
    return true;
  }
  try {
    const name=(row.title||row.raid_name).replace(/[@`*_~|>]/g,'').slice(0,100);
    const sent=await discord(`/channels/${channel}/messages`,{
      method:'POST',body:JSON.stringify({
        content:`New party: **${name}**\n${row.raid_name} · ${timestamp(row.start_time)}\n${origin}/parties/${row.party_id}`,
        allowed_mentions:{parse:[]},nonce:nonce(row.party_id),enforce_nonce:true,
      }),
    });
    await update({messageId:sent.id});
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
process.on('SIGTERM',()=>{running=false;});
process.on('SIGINT',()=>{running=false;});
while(running) {
  try {
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
