import { NextRequest, NextResponse } from "next/server";
import { revokeSessionByToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const isSecureCookie = process.env.NODE_ENV === "production";
    const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (rawToken) {
      await revokeSessionByToken(rawToken);
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureCookie,
      path: "/"
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
