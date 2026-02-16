import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT = 120;
const AUTH_RATE_LIMIT = 20;
const UPLOAD_RATE_LIMIT = 30;
const GIPHY_SEARCH_RATE_LIMIT = 20;
const GIPHY_IMPORT_RATE_LIMIT = 10;
const rateLimitStore = new Map<string, RateLimitRecord>();

function isPublicApiRoute(pathname: string): boolean {
  return pathname === "/api/auth/login" || pathname === "/api/auth/logout" || pathname === "/api/health";
}

function getRateLimit(pathname: string): number {
  if (pathname === "/api/auth/login") {
    return AUTH_RATE_LIMIT;
  }
  if (pathname === "/api/me/profile-image" || pathname === "/api/media/upload") {
    return UPLOAD_RATE_LIMIT;
  }
  if (pathname === "/api/media/giphy/search") {
    return GIPHY_SEARCH_RATE_LIMIT;
  }
  if (pathname === "/api/media/giphy/import") {
    return GIPHY_IMPORT_RATE_LIMIT;
  }

  return DEFAULT_RATE_LIMIT;
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstAddress = forwarded.split(",")[0]?.trim();
    if (firstAddress) {
      return firstAddress;
    }
  }

  return request.ip ?? "unknown";
}

function isRateLimited(request: NextRequest): boolean {
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return false;
  }

  const now = Date.now();
  const ip = getClientIp(request);
  const key = `${ip}:${request.nextUrl.pathname}`;
  const current = rateLimitStore.get(key);
  const maxRequests = getRateLimit(request.nextUrl.pathname);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS
    });
    return false;
  }

  if (current.count >= maxRequests) {
    return true;
  }

  current.count += 1;

  if (rateLimitStore.size > 5_000) {
    for (const [entryKey, record] of rateLimitStore.entries()) {
      if (record.resetAt <= now) {
        rateLimitStore.delete(entryKey);
      }
    }
  }

  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (isRateLimited(request)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  if (pathname.startsWith("/api")) {
    if (!isPublicApiRoute(pathname) && !hasSessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/app") && !hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/api/:path*"]
};
