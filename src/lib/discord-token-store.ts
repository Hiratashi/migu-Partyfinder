import crypto from "node:crypto";
import { query } from "@/lib/db";

type StoredTokenRow={
  access_token_enc:string;
  refresh_token_enc:string;
  expires_at:Date;
  scope:string|null;
};

type DiscordTokenResponse={
  access_token:string;
  refresh_token:string;
  expires_in:number;
  scope?:string;
  token_type:string;
};

function key() {
  const secret=process.env.APP_SECRET;
  if(!secret)throw new Error("APP_SECRET is required");

  return crypto
    .createHash("sha256")
    .update(secret,"utf8")
    .digest();
}

function encrypt(value:string) {
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv("aes-256-gcm",key(),iv);

  const encrypted=Buffer.concat([
    cipher.update(value,"utf8"),
    cipher.final(),
  ]);

  const tag=cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

function decrypt(value:string) {
  const [ivText,tagText,dataText]=value.split(".");

  if(!ivText||!tagText||!dataText) {
    throw new Error("Invalid encrypted Discord token");
  }

  const decipher=crypto.createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(ivText,"base64url"),
  );

  decipher.setAuthTag(Buffer.from(tagText,"base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(dataText,"base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export async function storeDiscordOAuthTokens(
  userId:string,
  token:DiscordTokenResponse,
) {
  const expiresAt=new Date(
    Date.now()+Math.max(30,token.expires_in)*1000,
  );

  await query(`
    INSERT INTO discord_oauth_tokens(
      user_id,
      access_token_enc,
      refresh_token_enc,
      expires_at,
      scope,
      updated_at
    )
    VALUES($1,$2,$3,$4,$5,now())
    ON CONFLICT(user_id)
    DO UPDATE SET
      access_token_enc=EXCLUDED.access_token_enc,
      refresh_token_enc=EXCLUDED.refresh_token_enc,
      expires_at=EXCLUDED.expires_at,
      scope=EXCLUDED.scope,
      updated_at=now()
  `,[
    userId,
    encrypt(token.access_token),
    encrypt(token.refresh_token),
    expiresAt,
    token.scope??null,
  ]);
}

export async function getStoredDiscordTokens(userId:string) {
  const r=await query<StoredTokenRow>(`
    SELECT
      access_token_enc,
      refresh_token_enc,
      expires_at,
      scope
    FROM discord_oauth_tokens
    WHERE user_id=$1
  `,[userId]);

  if(!r.rowCount)return null;

  return {
    accessToken:decrypt(r.rows[0].access_token_enc),
    refreshToken:decrypt(r.rows[0].refresh_token_enc),
    expiresAt:new Date(r.rows[0].expires_at),
    scope:r.rows[0].scope,
  };
}

export async function refreshDiscordOAuthToken(
  userId:string,
  refreshToken:string,
) {
  const clientId=process.env.DISCORD_CLIENT_ID;
  const clientSecret=process.env.DISCORD_CLIENT_SECRET;

  if(!clientId||!clientSecret) {
    throw new Error("Discord OAuth client configuration is missing");
  }

  const body=new URLSearchParams({
    grant_type:"refresh_token",
    refresh_token:refreshToken,
    client_id:clientId,
    client_secret:clientSecret,
  });

  const r=await fetch("https://discord.com/api/oauth2/token",{
    method:"POST",
    headers:{
      "content-type":"application/x-www-form-urlencoded",
    },
    body,
    cache:"no-store",
  });

  if(!r.ok) {
    throw new Error(`Discord token refresh failed: ${r.status}`);
  }

  const token=await r.json() as DiscordTokenResponse;

  await storeDiscordOAuthTokens(userId,token);

  return token;
}
