import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export const runtime="nodejs";

const PROFILE_IMAGE_NAME=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/i;

function uploadDirectory() {
  return path.join(process.cwd(),"uploads","profile-images");
}

export async function GET(
  _req:NextRequest,
  {params}:{params:Promise<{filename:string}>},
) {
  const {filename}=await params;

  if(!PROFILE_IMAGE_NAME.test(filename)) {
    return NextResponse.json({error:"not_found"},{status:404});
  }

  try {
    const file=await readFile(path.join(uploadDirectory(),filename));

    return new NextResponse(file,{
      status:200,
      headers:{
        "Content-Type":"image/webp",
        "Cache-Control":"public, max-age=31536000, immutable",
        "X-Content-Type-Options":"nosniff",
      },
    });
  } catch {
    return NextResponse.json({error:"not_found"},{status:404});
  }
}
