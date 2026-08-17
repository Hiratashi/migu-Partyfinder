type DiscordUser = { id: string; username: string; global_name?: string | null; avatar?: string | null };
type DiscordGuild = { id: string };
type DiscordMember = { roles: string[] };

function discordRedirectUri() {
  return process.env.DISCORD_REDIRECT_URI?.trim() ||
    `${process.env.APP_URL}/api/auth/callback`;
}

export function discordAuthorizeUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!,
    response_type: "code",
    redirect_uri: discordRedirectUri(),
    scope: "identify guilds",
    state,
    // Do not silently reuse the previous Discord authorization. Discord still owns
    // its browser login session, but this makes the account/authorization step visible.
    prompt: "consent"
  });
  return `https://discord.com/oauth2/authorize?${params}`;
}

async function discordGet<T>(path: string, token: string): Promise<T> {
  const r = await fetch(`https://discord.com/api/v10${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!r.ok) throw new Error(`Discord API failed: ${path}`);
  return r.json() as Promise<T>;
}
export const getDiscordUser = (t: string) => discordGet<DiscordUser>("/users/@me", t);
export const getDiscordGuilds = (t: string) => discordGet<DiscordGuild[]>("/users/@me/guilds", t);
export async function userHasRequiredRole(accessToken: string, guildId: string, roleId: string) {
  const r = await fetch(`https://discord.com/api/v10/users/@me/guilds/${guildId}/member`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!r.ok) return false;
  const member = await r.json() as DiscordMember;
  return member.roles.includes(roleId);
}
