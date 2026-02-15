import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const maxRetries = Number(process.env.DB_CONNECT_MAX_RETRIES ?? "30");
const retryDelayMs = Number(process.env.DB_CONNECT_RETRY_DELAY_MS ?? "2000");

async function waitForDatabase() {
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log("Database connection is ready.");
      return;
    } catch (error) {
      console.error(`Database not ready yet (attempt ${attempt}/${maxRetries}).`, error);
      if (attempt === maxRetries) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
}

waitForDatabase()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Database never became ready.", error);
    await prisma.$disconnect();
    process.exit(1);
  });
