import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_EMAIL = "max350457@gmail.com";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public/static routes
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname === "/maintenance" ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/logo") ||
    pathname.startsWith("/icon-") ||
    pathname === "/apple-touch-icon.png" ||
    pathname.startsWith("/uploads/")
  ) {
    return NextResponse.next();
  }

  // Check for auth session cookie (NextAuth)
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  if (!sessionToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check maintenance mode
  try {
    const baseUrl = request.nextUrl.origin;
    const res = await fetch(`${baseUrl}/api/admin/maintenance`, {
      headers: { "Cache-Control": "no-cache" },
    });
    const data = await res.json();

    if (data.maintenanceMode) {
      // Allow admin to bypass maintenance
      // We check via a special cookie set when admin logs in
      const isAdmin = request.cookies.get("streamora-admin")?.value === "true";
      if (!isAdmin) {
        return NextResponse.redirect(new URL("/maintenance", request.url));
      }
    }
  } catch {
    // If check fails, allow access
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
