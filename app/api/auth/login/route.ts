import { NextRequest, NextResponse } from "next/server";
import {
  createSessionForUser,
  findUserByIdentifier,
  toSafeUser,
  verifySharedPassword
} from "@/lib/auth";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/constants";
import { loginSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const isSecureCookie = process.env.NODE_ENV === "production";

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid login payload." }, { status: 400 });
    }

    const { identifier, password } = parsed.data;

    if (!verifySharedPassword(password)) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const user = await findUserByIdentifier(identifier);
    if (!user) {
      return NextResponse.json({ error: "Account not found. Contact an admin." }, { status: 403 });
    }

    const sessionToken = await createSessionForUser(user.id);

    const response = NextResponse.json({ user: toSafeUser(user) });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureCookie,
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/"
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
