import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"unauthorized"},{status:401});
  const result=await query<{count:string}>(
    "SELECT count(*)::text AS count FROM notifications WHERE user_id=$1 AND read_at IS NULL",
    [user.id],
  );
  return NextResponse.json({count:Number(result.rows[0].count)},{headers:{"Cache-Control":"no-store"}});
}
