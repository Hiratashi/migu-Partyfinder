import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { limitWrite } from "@/lib/rate-limit";

export const runtime="nodejs";

const MAX_UPLOAD_BYTES=5*1024*1024;
const MAX_REQUEST_BYTES=6*1024*1024;
const PROFILE_IMAGE_NAME=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/i;

const ACCEPTED_TYPES=new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function uploadDirectory() {
  return path.join(process.cwd(),"uploads","profile-images");
}

function safeStoredFilename(value:string|null):value is string {
  return Boolean(value&&PROFILE_IMAGE_NAME.test(value));
}

async function removeStoredImage(filename:string|null) {
  if(!safeStoredFilename(filename))return;

  await unlink(path.join(uploadDirectory(),filename)).catch(e=>{
    if((e as NodeJS.ErrnoException).code!=="ENOENT") {
      console.error("Could not remove profile image",e);
    }
  });
}

export async function POST(req:NextRequest) {
  if(!sameOrigin(req)) {
    return NextResponse.json({error:"bad_origin"},{status:403});
  }

  const rateLimited=limitWrite(req);
  if(rateLimited)return rateLimited;

  const user=await currentUser();

  if(!user) {
    return NextResponse.json({error:"unauthorized"},{status:401});
  }

  const contentLength=Number(req.headers.get("content-length")??"0");

  if(
    Number.isFinite(contentLength)&&
    contentLength>MAX_REQUEST_BYTES
  ) {
    return NextResponse.json({
      error:"image_too_large",
      message:"Profile pictures must be 5 MB or smaller.",
    },{status:413});
  }

  let form:FormData;

  try {
    form=await req.formData();
  } catch {
    return NextResponse.json(
      {error:"invalid_form_data"},
      {status:400},
    );
  }

  const image=form.get("image");

  if(!(image instanceof File)) {
    return NextResponse.json({
      error:"missing_image",
      message:"Choose an image to upload.",
    },{status:400});
  }

  if(image.size===0) {
    return NextResponse.json({
      error:"empty_image",
      message:"The selected image is empty.",
    },{status:400});
  }

  if(image.size>MAX_UPLOAD_BYTES) {
    return NextResponse.json({
      error:"image_too_large",
      message:"Profile pictures must be 5 MB or smaller.",
    },{status:413});
  }

  if(!ACCEPTED_TYPES.has(image.type)) {
    return NextResponse.json({
      error:"unsupported_image_type",
      message:"Use a JPEG, PNG, or WebP image.",
    },{status:415});
  }

  let processed:Buffer;

  try {
    const input=Buffer.from(await image.arrayBuffer());

    processed=await sharp(input,{
      failOn:"error",
      limitInputPixels:20_000_000,
    })
      .rotate()
      .resize(512,512,{
        fit:"cover",
        position:"centre",
      })
      .webp({quality:85})
      .toBuffer();
  } catch {
    return NextResponse.json({
      error:"invalid_image",
      message:"The uploaded file could not be processed as an image.",
    },{status:400});
  }

  const directory=uploadDirectory();
  const filename=`${randomUUID()}.webp`;
  const destination=path.join(directory,filename);

  try {
    await mkdir(directory,{recursive:true});

    await writeFile(
      destination,
      processed,
      {
        flag:"wx",
        mode:0o600,
      },
    );
  } catch(e) {
    console.error(e);

    return NextResponse.json(
      {error:"image_storage_failed"},
      {status:500},
    );
  }

  const client=await db.connect();
  let previous:string|null=null;

  try {
    await client.query("BEGIN");

    const existing=await client.query<{
      profile_image_path:string|null;
    }>(`
      SELECT profile_image_path
      FROM users
      WHERE id=$1
      FOR UPDATE
    `,[user.id]);

    previous=
      existing.rows[0]?.profile_image_path??null;

    await client.query(`
      UPDATE users
      SET
        profile_image_path=$1,
        updated_at=now()
      WHERE id=$2
    `,[filename,user.id]);

    await client.query(`
      INSERT INTO audit_log(
        user_id,
        action,
        entity_type,
        entity_id,
        metadata
      )
      VALUES(
        $1,
        'PROFILE_IMAGE_UPDATE',
        'user',
        $2,
        jsonb_build_object(
          'format','webp',
          'size_bytes',$3::int
        )
      )
    `,[user.id,user.id,processed.length]);

    await client.query("COMMIT");
  } catch(e) {
    await client.query("ROLLBACK");

    await unlink(destination).catch(()=>{});

    console.error(e);

    return NextResponse.json(
      {error:"server_error"},
      {status:500},
    );
  } finally {
    client.release();
  }

  if(previous!==filename) {
    await removeStoredImage(previous);
  }

  return NextResponse.json({
    ok:true,
    profileImageUrl:`/api/profile/image/${filename}`,
  });
}

export async function DELETE(req:NextRequest) {
  if(!sameOrigin(req)) {
    return NextResponse.json({error:"bad_origin"},{status:403});
  }

  const rateLimited=limitWrite(req);
  if(rateLimited)return rateLimited;

  const user=await currentUser();

  if(!user) {
    return NextResponse.json({error:"unauthorized"},{status:401});
  }

  const client=await db.connect();
  let previous:string|null=null;

  try {
    await client.query("BEGIN");

    const existing=await client.query<{
      profile_image_path:string|null;
    }>(`
      SELECT profile_image_path
      FROM users
      WHERE id=$1
      FOR UPDATE
    `,[user.id]);

    previous=
      existing.rows[0]?.profile_image_path??null;

    await client.query(`
      UPDATE users
      SET
        profile_image_path=NULL,
        updated_at=now()
      WHERE id=$1
    `,[user.id]);

    await client.query(`
      INSERT INTO audit_log(
        user_id,
        action,
        entity_type,
        entity_id
      )
      VALUES(
        $1,
        'PROFILE_IMAGE_REMOVE',
        'user',
        $2
      )
    `,[user.id,user.id]);

    await client.query("COMMIT");
  } catch(e) {
    await client.query("ROLLBACK");

    console.error(e);

    return NextResponse.json(
      {error:"server_error"},
      {status:500},
    );
  } finally {
    client.release();
  }

  await removeStoredImage(previous);

  return NextResponse.json({ok:true});
}