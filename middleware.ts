// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Public paths that don't need login
  const publicPaths = [
    "/",          // landing
    "/login",     // login page
    "/demo",      // free demo page
    "/_next",     // Next.js assets
    "/favicon",   // icons
    "/public",    // any public assets
    "/api/public" // your public APIs (optional)
  ];

  const { pathname } = req.nextUrl;

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return res;
  }

  // Supabase session check
  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If not logged in, send to /login?redirect=...
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

// Only run middleware for site routes (not static files)
export const config = {
  matcher: [
    // Run on ALL routes except: Next static, images, favicon, public assets, and API routes
    "/((?!_next/static|_next/image|favicon.ico|images|fonts|api).*)",
  ],
};
