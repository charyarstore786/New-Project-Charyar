import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin/auth";

export const config = {
  // Node.js runtime (not Edge) so the HMAC check in lib/admin/auth can use
  // the built-in `crypto` module.
  runtime: "nodejs",
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isLoginPage = pathname === "/admin/login";
  const isLoginApi = pathname === "/api/admin/login";
  if (isLoginPage || isLoginApi) return NextResponse.next();

  const denyOrRedirect = () => {
    if (pathname.startsWith("/api/admin/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  };

  try {
    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    if (verifySessionToken(token)) return NextResponse.next();
  } catch (err) {
    // Fail closed: any unexpected error (e.g. a missing env var) should
    // still gate access rather than crashing every /admin request.
    console.error("Admin auth check failed:", err);
  }

  return denyOrRedirect();
}
