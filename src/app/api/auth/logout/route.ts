import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { sameOrigin } from "@/lib/security";
import { limitWrite } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }
  const rateLimited=limitWrite(req);
  if(rateLimited)return rateLimited;

  await destroySession();

  return NextResponse.redirect(`${process.env.APP_URL}/login`, 303);
}
