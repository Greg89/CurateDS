import { NextRequest, NextResponse } from "next/server";
import { getAuthClient, isAuthConfigured } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (
    path === "/health" ||
    path === "/showcase" ||
    path.startsWith("/showcase/") ||
    path === "/showcase.css"
  ) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  }
  if (!isAuthConfigured()) {
    if (request.nextUrl.pathname.startsWith("/auth/")) {
      return new NextResponse("Sign-in is temporarily unavailable.", {
        status: 503,
      });
    }
    return NextResponse.next();
  }
  return getAuthClient().middleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
