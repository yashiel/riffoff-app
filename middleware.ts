import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/appwrite/config";

/** Routes that don't require authentication */
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/verify",
  "/callback",
  "/events",
  "/privacy",
  "/terms",
  "/api/webhooks",
  "/api/gate",
];

/** Allowed origins for CORS on gate API routes */
const GATE_CORS_ORIGINS = [
  "http://localhost:3001",
  "https://scan.riffoff.live",
  "https://riffoff-gate-deploy.vercel.app",
  "https://riffoff-gate-deploy-yashi-els-projects.vercel.app",
];

/** Check if a path matches any public route prefix */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/** Check if this is a gate API request that needs CORS */
function isGateApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/gate");
}

/** Security headers applied to all responses */
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "0",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(self), microphone=(), geolocation=(), payment=(self)",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.paypal.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://*.appwrite.io https://yashilanka.com https://*.vercel.app https://fastly.picsum.photos https://picsum.photos",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.appwrite.io https://yashilanka.com https://riffoff.live https://*.riffoff.live https://api.stripe.com https://www.paypal.com https://*.paypal.com https://api-m.sandbox.paypal.com https://api-m.paypal.com",
    "frame-src https://js.stripe.com https://www.paypal.com https://*.paypal.com https://www.youtube.com https://youtube.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; "),
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin") ?? "";

  // Handle CORS preflight for gate API routes
  if (isGateApiRoute(pathname) && request.method === "OPTIONS") {
    if (GATE_CORS_ORIGINS.includes(origin)) {
      const response = new NextResponse(null, { status: 204 });
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Screen-Size, X-Timezone, X-Language");
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set("Access-Control-Max-Age", "86400");
      return response;
    }
    return new NextResponse(null, { status: 403 });
  }

  const session = request.cookies.get(SESSION_COOKIE_NAME);

  // Redirect /dashboard index to /dashboard/tickets (avoid redirect() in page component)
  if (pathname === "/dashboard" && session?.value) {
    const ticketsUrl = new URL("/dashboard/tickets", request.url);
    const response = NextResponse.redirect(ticketsUrl);
    applySecurityHeaders(response);
    return response;
  }

  // Allow public routes and static assets
  if (isPublicRoute(pathname)) {
    const response = NextResponse.next();
    applySecurityHeaders(response);
    if (isGateApiRoute(pathname) && GATE_CORS_ORIGINS.includes(origin)) {
      applyCorsHeaders(response, origin);
    }
    return response;
  }

  // No session → redirect to login
  if (!session?.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(loginUrl);
    applySecurityHeaders(response);
    return response;
  }

  const response = NextResponse.next();
  applySecurityHeaders(response);
  return response;
}

function applySecurityHeaders(response: NextResponse) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
}

function applyCorsHeaders(response: NextResponse, origin: string) {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|sw.js|manifest.json|icons/.*|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.ico$).*)",
  ],
};
