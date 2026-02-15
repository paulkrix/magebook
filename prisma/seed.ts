import { PrismaClient, type UserRole } from "@prisma/client";
import { config as loadEnv } from "dotenv";

const prisma = new PrismaClient();
loadEnv();

type SeedUser = {
  username: string;
  email: string | null;
  displayName: string;
  role: UserRole;
};

const defaultUsers: SeedUser[] = [
  { username: "alice", email: "alice@example.com", displayName: "Alice Rivera", role: "ADMIN" },
  { username: "bob", email: "bob@example.com", displayName: "Bob Chen", role: "USER" },
  { username: "carol", email: "carol@example.com", displayName: "Carol Patel", role: "USER" },
  { username: "dave", email: "dave@example.com", displayName: "Dave Kim", role: "USER" }
];

function parseAdminIdentifiers(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0)
  );
}

function normalizeRole(raw: string | undefined): UserRole {
  const value = raw?.trim().toUpperCase();
  if (!value || value === "USER") {
    return "USER";
  }
  if (value === "ADMIN") {
    return "ADMIN";
  }

  throw new Error(`Invalid role '${raw}'. Allowed values are USER or ADMIN.`);
}

function normalizeUser(
  user: { username: string; email?: string | null; displayName: string; role?: string },
  adminIdentifiers: Set<string>
): SeedUser {
  const username = user.username.trim().toLowerCase();
  const email = user.email?.trim().toLowerCase() || null;
  const displayName = user.displayName.trim();
  const roleFromInput = normalizeRole(user.role);
  const isConfiguredAdmin = adminIdentifiers.has(username) || Boolean(email && adminIdentifiers.has(email));
  const role: UserRole = isConfiguredAdmin ? "ADMIN" : roleFromInput;

  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    throw new Error(`Invalid username '${user.username}'. Must match ^[a-z0-9_]{3,24}$`);
  }

  if (!displayName) {
    throw new Error(`Invalid displayName for '${user.username}'.`);
  }

  return { username, email, displayName, role };
}

function parseSeedUsers(raw: string | undefined): SeedUser[] {
  const adminIdentifiers = parseAdminIdentifiers(process.env.ADMIN_IDENTIFIERS);

  if (!raw || !raw.trim()) {
    return defaultUsers.map((user) => normalizeUser(user, adminIdentifiers));
  }

  const input = raw.trim();

  if (input.startsWith("[")) {
    const parsed = JSON.parse(input) as Array<{ username: string; email?: string; displayName: string; role?: string }>;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("SEED_USERS JSON must be a non-empty array.");
    }

    return parsed.map((entry) => normalizeUser(entry, adminIdentifiers));
  }

  // Compact format: username|email|displayName|role;username2||Display Name 2|USER
  const users = input
    .split(";")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const [username, email, displayName, role] = entry.split("|");
      if (!username || displayName === undefined) {
        throw new Error("SEED_USERS compact format is invalid. Use username|email|displayName|role entries.");
      }

      return normalizeUser({ username, email: email || null, displayName, role }, adminIdentifiers);
    });

  if (users.length === 0) {
    throw new Error("SEED_USERS did not include any valid user entries.");
  }

  return users;
}

async function main() {
  const users = parseSeedUsers(process.env.SEED_USERS);

  console.log(`Seeding ${users.length} user(s)...`);

  for (const user of users) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: {
        email: user.email,
        displayName: user.displayName,
        role: user.role
      },
      create: user
    });
  }

  console.log("Seed complete.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
