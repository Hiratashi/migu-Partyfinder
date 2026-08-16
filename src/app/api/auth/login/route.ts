import { NextRequest, NextResponse } from "next/server";
import { randomToken } from "@/lib/crypto";
import { discordAuthorizeUrl } from "@/lib/discord";
import { limitAuthLogin } from "@/lib/rate-limit";
import { setOAuthStateCookie } from "@/lib/cookie-config";

export async function GET(req: NextRequest) {
  const limited = limitAuthLogin(req);
  if (limited) return limited;
  const state = randomToken(24);
  await setOAuthStateCookie(state);
  return NextResponse.redirect(discordAuthorizeUrl(state));
}
