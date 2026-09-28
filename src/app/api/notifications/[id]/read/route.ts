import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { limitWrite } from "@/lib/rate-limit";

export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}) {
  if(!sameOrigin(req))return NextResponse.json({error:"bad_origin"},{status:403});
  const limited=limitWrite(req);
  if(limited)return limited;
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"unauthorized"},{status:401});
  const {id}=await params;
  if(!z.uuid().safeParse(id).success)return NextResponse.json({error:"invalid_id"},{status:400});
  const result=await query(`
    UPDATE notifications SET read_at=COALESCE(read_at,now())
    WHERE id=$1 AND user_id=$2 RETURNING id
  `,[id,user.id]);
  if(!result.rowCount)return NextResponse.json({error:"not_found"},{status:404});
  return NextResponse.json({ok:true});
}
