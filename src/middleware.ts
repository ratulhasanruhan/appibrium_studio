import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define public paths that bypass auth middleware
  const isPublicPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/public/") ||
    pathname.startsWith("/branding_assets/") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".css");

  if (isPublicPath) {
    return NextResponse.next();
  }

  // To allow full evaluation and preview without Appwrite API keys,
  // we check if Appwrite endpoints are defined. If not, we skip auth redirection.
  const appwriteProject = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  if (!appwriteProject) {
    return NextResponse.next();
  }

  // In a fully configured environment, retrieve standard Appwrite cookies:
  // Appwrite sets cookies starting with `a_session_` followed by the project ID.
  const sessionCookieName = `a_session_${appwriteProject}`;
  const hasSession =
    request.cookies.has(sessionCookieName) ||
    request.cookies.has("a_session") ||
    request.cookies.has("session");

  if (!hasSession && pathname !== "/login") {
    // Redirect to login page if unauthenticated
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasSession && pathname === "/login") {
    // Redirect to dashboard if already authenticated
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
