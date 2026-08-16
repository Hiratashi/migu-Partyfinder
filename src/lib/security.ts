import { NextRequest } from "next/server";

export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");

  // Partyfinder's browser write requests must carry Origin. Rejecting a
  // missing Origin prevents non-browser/cross-site clients from bypassing the
  // CSRF check merely by omitting the header.
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(process.env.APP_URL!).origin;
  } catch {
    return false;
  }
}
