import { NextRequest, NextResponse } from "next/server";
import { getAuthClient, isAuthConfigured } from "@/lib/auth";

export async function proxy(request: NextRequest) {
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
