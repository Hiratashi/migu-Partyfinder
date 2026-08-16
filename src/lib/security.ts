import { NextRequest } from "next/server";

export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients can be controlled separately at the proxy
  try { return new URL(origin).origin === new URL(process.env.APP_URL!).origin; }
  catch { return false; }
}
