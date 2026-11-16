import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifyToken } from "@/lib/session";

// Protège /admin (Admin + Inspecteur) et /applicant (Demandeur). Les API revérifient session et rôle.
export async function middleware(req: NextRequest) {
  const session = await verifyToken(req.cookies.get(COOKIE_NAME)?.value);
  const { pathname } = req.nextUrl;
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login"; url.search = "";
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/admin") && session.role === "APPLICANT") return NextResponse.redirect(new URL("/applicant", req.url));
  if (pathname.startsWith("/applicant") && session.role !== "APPLICANT") return NextResponse.redirect(new URL("/admin", req.url));
  return NextResponse.next();
}
export const config = { matcher: ["/admin/:path*", "/applicant/:path*"] };
