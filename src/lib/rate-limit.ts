import { NextRequest, NextResponse } from "next/server";

type Entry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  scope: string;
  limit: number;
  windowMs: number;
};

const entries = new Map<string, Entry>();
const MAX_KEYS = 10_000;

function clientKey(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "local";

  return ip.slice(0, 128);
}

function prune(now: number) {
  for (const [key, entry] of entries) {
    if (entry.resetAt <= now) entries.delete(key);
  }

  while (entries.size >= MAX_KEYS) {
    const oldest = entries.keys().next().value as string | undefined;
    if (!oldest) break;
    entries.delete(oldest);
  }
}

export function rateLimit(
  req: NextRequest,
  { scope, limit, windowMs }: RateLimitOptions,
): NextResponse | null {
  const now = Date.now();
  prune(now);

  const key = `${scope}:${clientKey(req)}`;
  let entry = entries.get(key);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    entries.set(key, entry);
  }

  entry.count += 1;

  const retryAfter = Math.max(
    1,
    Math.ceil((entry.resetAt - now) / 1000),
  );

  if (entry.count > limit) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  return null;
}

export function limitAuthLogin(req: NextRequest) {
  return rateLimit(req, {
    scope: "auth-login",
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
}

export function limitAuthCallback(req: NextRequest) {
  return rateLimit(req, {
    scope: "auth-callback",
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });
}

export function limitWrite(req: NextRequest) {
  return rateLimit(req, {
    scope: "authenticated-write",
    limit: 60,
    windowMs: 60 * 1000,
  });
}
