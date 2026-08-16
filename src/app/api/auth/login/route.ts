import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomToken } from "@/lib/crypto";
import { discordAuthorizeUrl } from "@/lib/discord";
import { limitAuthLogin } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const limited = limitAuthLogin(req);
  if (limited) return limited;
  const state = randomToken(24);
  (await cookies()).set("discord_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.SECURE_COOKIES === "true", maxAge: 600, path: "/" });
  return NextResponse.redirect(discordAuthorizeUrl(state));
}
