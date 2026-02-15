import { randomBytes, createHash, timingSafeEqual } from "crypto";
import type { User, UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/constants";

export type SafeUser = {
  id: string;
  username: string;
  email: string | null;
  displayName: string;
  profileImageUrl: string | null;
  role: UserRole;
};

function getSessionSecret(): string {
  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret) {
    throw new Error("SESSION_SECRET is not configured.");
  }

  return sessionSecret;
}

function hashHex(input: string): string {
  return createHash("sha256").update(`${getSessionSecret()}:${input}`).digest("hex");
}

export function verifySharedPassword(providedPassword: string): boolean {
  const sharedPassword = process.env.SHARED_PASSWORD;

  if (!sharedPassword) {
    throw new Error("SHARED_PASSWORD is not configured.");
  }

  const expectedHash = createHash("sha256").update(sharedPassword).digest();
  const providedHash = createHash("sha256").update(providedPassword).digest();

  return timingSafeEqual(providedHash, expectedHash);
}

function normalizeIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

export async function findUserByIdentifier(identifier: string): Promise<User | null> {
  const normalized = normalizeIdentifier(identifier);
  const identifierIsEmail = normalized.includes("@");

  return prisma.user.findFirst({
    where: identifierIsEmail
      ? {
          OR: [{ email: normalized }, { username: normalized }]
        }
      : {
          username: normalized
        }
  });
}

export function isUserAdmin(user: Pick<User, "role">): boolean {
  return user.role === "ADMIN";
}

export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    profileImageUrl: user.profileImageUrl,
    role: user.role
  };
}

export async function createSessionForUser(userId: string): Promise<string> {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashHex(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt
    }
  });

  return rawToken;
}

export async function revokeSessionByToken(rawToken: string): Promise<void> {
  const tokenHash = hashHex(rawToken);
  await prisma.session.updateMany({
    where: {
      tokenHash,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });
}

async function getUserByRawSessionToken(rawToken: string): Promise<User | null> {
  const tokenHash = hashHex(rawToken);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true }
  });

  if (!session) {
    return null;
  }

  if (session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  return session.user;
}

export async function getUserFromRequest(request: NextRequest): Promise<User | null> {
  const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!rawToken) {
    return null;
  }

  return getUserByRawSessionToken(rawToken);
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!rawToken) {
    return null;
  }

  return getUserByRawSessionToken(rawToken);
}

export async function requirePageUser(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
