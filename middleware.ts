import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/appwrite/config";

/** Routes that don't require authentication */
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/callback",
  "/events",
  "/api/webhooks",
];

/** Check if a path matches any public route prefix */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get(SESSION_COOKIE_NAME);

  // Allow public routes and static assets
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // No session → redirect to login
  if (!session?.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.ico$).*)",
  ],
};
