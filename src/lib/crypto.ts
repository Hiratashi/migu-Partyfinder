import crypto from "node:crypto";

export function randomToken(bytes = 32) { return crypto.randomBytes(bytes).toString("base64url"); }
export function sessionDigest(value: string) {
  const secret = process.env.APP_SECRET;
  if (!secret || secret.length < 32) throw new Error("APP_SECRET must be at least 32 characters");
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}
export function timingSafeEqual(a: string, b: string) {
  const aa = Buffer.from(a); const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
