import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth"; import { query } from "@/lib/db"; import { sameOrigin } from "@/lib/security"; import { z } from "zod";
import { limitWrite } from "@/lib/rate-limit";
const schema=z.object({userId:z.string().uuid()});
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){if(!sameOrigin(req))return NextResponse.json({error:'bad_origin'},{status:403});
  const rateLimited=limitWrite(req);
  if(rateLimited)return rateLimited;
const user=await currentUser();if(!user)return NextResponse.json({error:'unauthorized'},{status:401});const {id}=await params;const body=schema.safeParse(await req.json().catch(()=>null));if(!body.success)return NextResponse.json({error:'invalid_input'},{status:400});const party=await query('SELECT 1 FROM parties WHERE id=$1 AND leader_id=$2 AND status=\'OPEN\'',[id,user.id]);if(!party.rowCount)return NextResponse.json({error:'forbidden'},{status:403});const target=await query('SELECT 1 FROM users WHERE id=$1',[body.data.userId]);if(!target.rowCount)return NextResponse.json({error:'unknown_user'},{status:404});await query(`INSERT INTO party_members(party_id,user_id,status) VALUES($1,$2,'INVITED') ON CONFLICT(party_id,user_id) DO UPDATE SET status='INVITED'`,[id,body.data.userId]);await query("INSERT INTO audit_log(user_id,action,entity_type,entity_id,metadata) VALUES($1,'PARTY_INVITE','party',$2,jsonb_build_object('invited_user_id',$3::text))",[user.id,id,body.data.userId]);return NextResponse.json({ok:true})}
