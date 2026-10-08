import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { OWNER_ID_COOKIE } from "@/lib/ownerId";

// بيضمن إن كل متصفح/شخص عنده هوية ثابتة (appUserId) من أول زيارة،
// قبل ما يوصل لأي صفحة أو API — ده اللي بيفرّق القنوات بين شخص وشخص
export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  if (!req.cookies.get(OWNER_ID_COOKIE)) {
    res.cookies.set(OWNER_ID_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365 * 5, // 5 سنين
      path: "/",
    });
  }

  return res;
}

export const config = {
  matcher: "/:path*",
};
