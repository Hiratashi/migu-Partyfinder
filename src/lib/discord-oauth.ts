export type DiscordOAuthToken={
  access_token:string;
  refresh_token:string;
  expires_in:number;
  scope?:string;
  token_type:string;
};

export async function exchangeDiscordCodeWithRefresh(
  code:string,
):Promise<DiscordOAuthToken> {
  const clientId=process.env.DISCORD_CLIENT_ID;
  const clientSecret=process.env.DISCORD_CLIENT_SECRET;
  const appUrl=process.env.APP_URL;

  if(!clientId||!clientSecret||!appUrl) {
    throw new Error("Discord OAuth configuration is incomplete");
  }
  const redirectUri=
    process.env.DISCORD_REDIRECT_URI?.trim()||
    `${appUrl}/api/auth/callback`;

  const body=new URLSearchParams({
    grant_type:"authorization_code",
    code,
    redirect_uri:redirectUri,
  });

  const auth=Buffer
    .from(`${clientId}:${clientSecret}`)
    .toString("base64");
  const r=await fetch("https://discord.com/api/oauth2/token",{
    method:"POST",
    headers:{
      authorization:`Basic ${auth}`,
      "content-type":"application/x-www-form-urlencoded",
    },
    body,
    cache:"no-store",
  });

  if(!r.ok) {
    // Do not include Discord's response body in application logs. OAuth error
    // payloads are not needed for normal diagnostics and may contain details
    // we do not want persisted by production logging.
    throw new Error(
      `Discord OAuth exchange failed with HTTP ${r.status}`,
    );
  }

  return await r.json() as DiscordOAuthToken;
}
