import { NextResponse, type NextRequest } from "next/server";

/**
 * Fast first gate: no session cookie => straight to sign-in.
 * The authoritative checks (session validity, ADMIN role) run server-side in every admin page and action.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = !!req.cookies.get("sk_session")?.value;
  const isProtected = pathname.startsWith("/admin") || (pathname.startsWith("/account") && !pathname.startsWith("/account/login") && !pathname.startsWith("/account/register"));
  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/account/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/dev/") && process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_IN_PRODUCTION !== "true") {
    return new NextResponse("Not found", { status: 404 });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/account/:path*", "/dev/:path*"] };
